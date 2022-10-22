import fs from "fs/promises";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";

import { ValueSourceHub, ValueSourceHubBase } from ".";

export class HdfcVSH extends ValueSourceHubBase {
  constructor(
    private name: string | undefined,
    private fileOrFolderName: string
  ) {
    super();
  }

  private async processFile(fileName: string) {
    const wb = XLSX.readFile(fileName);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
      header: "A",
    }) as { [key: string]: unknown }[];
    const dateValues: { [key: string]: number } = {};
    rows.forEach((r) => {
      if (
        r.A &&
        typeof r.G === "number" &&
        /^\d{2}\/\d{2}\/\d{2}$/.test(r.A as string)
      ) {
        dateValues[DateTime.fromFormat(r.A as string, "dd/MM/yy").toISODate()] =
          Math.floor(r.G * 100);
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
      name: `${this.name || ValueSourceHub.Hdfc} - Savings Balance`,
      hub: ValueSourceHub.Hdfc,
      dateAmounts: dateAmounts,
    });
  }
}
