import { DateTime } from "luxon";

export type ValueSource = {
  name: string;
  hub: ValueSourceHub;
  // amounts tracked in paise
  dateAmounts: { [key: string]: number };
};

export enum ValueSourceHub {
  Zerodha = "Zerodha",
  Hdfc = "Hdfc",
  Jupiter = "Jupiter",
}

export enum DataSourceType {
  Json = "Json",
  Spreadsheet = "Spreadsheet",
}

export enum DataSourceInputMethod {
  LocalFile = "LocalFile",
}

export type DataSource = {
  type: DataSourceType;
  inputMethod: DataSourceInputMethod;
  input: string;
};

export abstract class ValueSourceHubBase {
  protected valueSources: ValueSource[] = [];

  abstract process(): Promise<void>;

  static normalizeValueSources(valueSources: ValueSource[]) {
    const minDateAcrossVS = DateTime.fromISO(
      valueSources
        .map((vs) => Object.keys(vs.dateAmounts))
        .flat()
        .sort()[0]
    ).startOf("day");
    valueSources.forEach((vs) => {
      const datesInVS = Object.keys(vs.dateAmounts).sort();

      if (datesInVS.length <= 1) {
        return;
      }

      const minDate = DateTime.fromISO(datesInVS[0]).startOf("day");
      const maxDate = DateTime.now().startOf("day");
      let previousValue = 0;
      let currDate = minDateAcrossVS.startOf("day");
      while (currDate < minDate) {
        vs.dateAmounts[currDate.toISODate()] = 0;
        currDate = currDate.plus({ days: 1 });
      }

      currDate = minDate.startOf("day");
      while (currDate <= maxDate) {
        const currDateStr = currDate.toISODate();
        if (datesInVS.includes(currDateStr)) {
          previousValue = vs.dateAmounts[currDateStr];
        } else {
          vs.dateAmounts[currDateStr] = previousValue;
        }
        currDate = currDate.plus({ days: 1 });
      }
      const newDatesInVS = Object.keys(vs.dateAmounts).sort();
      const orderedDateAmounts: { [key: string]: number } = {};
      newDatesInVS.forEach((d) => (orderedDateAmounts[d] = vs.dateAmounts[d]));
      vs.dateAmounts = orderedDateAmounts;
    });
  }
  async processAndGetValueSources() {
    await this.process();
    return this.valueSources.map((vs) => ({ ...vs })) as ValueSource[];
  }
}
