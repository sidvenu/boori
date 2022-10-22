import fs from "fs/promises";

import { ValueSourceHub, ValueSourceHubBase } from ".";

type ZerodhaInput = {
  [key: string]: {
    payin: string;
    margin: string;
    payout: string;
    net_balance: number;
    positions_value: number;
    eq_holdings_value: number;
    mf_holdings_value: number;
  };
};

export class ZerodhaVSH extends ValueSourceHubBase {
  constructor(private name: string | undefined, private fileName: string) {
    super();
  }

  async process() {
    const data = JSON.parse(
      (await fs.readFile(this.fileName)).toString()
    ) as ZerodhaInput;
    const mfDateAmounts: { [key: string]: number } = {};
    const equityDateAmounts: { [key: string]: number } = {};
    const cashDateAmounts: { [key: string]: number } = {};
    Object.keys(data).forEach((k) => {
      const zData = data[k];
      mfDateAmounts[k] = Math.floor(zData.mf_holdings_value * 100);
      equityDateAmounts[k] = Math.floor(zData.eq_holdings_value * 100);
      cashDateAmounts[k] = Math.floor(zData.net_balance * 100);
    });
    this.valueSources.push({
      name: `${this.name || ValueSourceHub.Zerodha} - MF`,
      hub: ValueSourceHub.Zerodha,
      dateAmounts: mfDateAmounts,
    });
    this.valueSources.push({
      name: `${this.name || ValueSourceHub.Zerodha} - Equity`,
      hub: ValueSourceHub.Zerodha,
      dateAmounts: equityDateAmounts,
    });
    this.valueSources.push({
      name: `${this.name || ValueSourceHub.Zerodha} - Cash Balance`,
      hub: ValueSourceHub.Zerodha,
      dateAmounts: cashDateAmounts,
    });
  }
}
