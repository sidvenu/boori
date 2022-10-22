import fs from "fs/promises";
import { DateTime } from "luxon";
import pdf from "pdf-parse";

import { ValueSourceHub, ValueSourceHubBase } from ".";

export class JupiterVSH extends ValueSourceHubBase {
  constructor(
    private name: string | undefined,
    private fileOrFolderName: string,
    private password?: string
  ) {
    super();
  }

  private async processFile(fileName: string) {
    const x = await pdf({
      url: fileName,
      password: this.password,
    } as unknown as Buffer);
    let currentISODate: string | null = null;
    const dateValues: { [key: string]: number } = {};
    const lines = x.text.split("\n");
    lines.forEach((line, i) => {
      if (/^\d{1,2}\s+[a-zA-Z]+\s+'\d{2}/.test(line)) {
        const dateStr = /^(\d{1,2}\s+[a-zA-Z]+\s+'\d{2})/
          .exec(line)?.[0]
          ?.replace("'", "");
        if (!dateStr) {
          return;
        }
        currentISODate = DateTime.fromFormat(dateStr, "d MMM yy").toISODate();
      } else if (/^[A-Z]+\d{3,}/.test(line) && currentISODate) {
        const txnAmountLine = lines[i + 1];
        const balanceAmountLine = lines[i + 2];
        if (
          txnAmountLine.startsWith("₹") &&
          balanceAmountLine.startsWith("₹")
        ) {
          dateValues[currentISODate] = Math.floor(
            parseFloat(balanceAmountLine.replaceAll(/[^\d.]/g, "")) * 100
          );
        }
      }
    });
    return dateValues;
  }

  async process() {
    let dateAmounts: { [key: string]: number };
    if ((await fs.lstat(this.fileOrFolderName)).isDirectory()) {
      const files = await fs.readdir(this.fileOrFolderName);
      const dateValuesArr = await Promise.all(
        files.map(async (f) =>
          this.processFile(`${this.fileOrFolderName}/${f}`)
        )
      );
      dateAmounts = Object.assign({}, ...dateValuesArr);
    } else {
      dateAmounts = await this.processFile(this.fileOrFolderName);
    }
    this.valueSources.push({
      name: `${this.name || ValueSourceHub.Jupiter} - Savings Balance`,
      hub: ValueSourceHub.Jupiter,
      dateAmounts: dateAmounts,
    });
  }
}
