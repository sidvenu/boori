import { ZerodhaVSH } from "./value-source/zerodha";
import * as XLSX from "xlsx";
import {
  ValueSource,
  ValueSourceHub,
  ValueSourceHubBase,
} from "./value-source";
import { median } from "./util";
import fs from "fs/promises";
import { JupiterVSH } from "./value-source/jupiter";
import { HdfcVSH } from "./value-source/hdfc";

type SourcesInput = {
  name?: string;
  type: ValueSourceHub;
  url: string;
  password?: string;
}[];

(async () => {
  const input = JSON.parse(
    (await fs.readFile(process.env.INPUT_FILE as string)).toString()
  ) as SourcesInput;
  const valueSources: ValueSource[] = [];
  await Promise.all(
    input.map(async (s) => {
      switch (s.type) {
        case ValueSourceHub.Zerodha: {
          valueSources.push(
            ...(await new ZerodhaVSH(s.name, s.url).processAndGetValueSources())
          );
          break;
        }
        case ValueSourceHub.Hdfc: {
          valueSources.push(
            ...(await new HdfcVSH(s.name, s.url).processAndGetValueSources())
          );
          break;
        }
        case ValueSourceHub.Jupiter: {
          valueSources.push(
            ...(await new JupiterVSH(
              s.name,
              s.url,
              s.password
            ).processAndGetValueSources())
          );
          break;
        }
      }
    })
  );
  valueSources.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  ValueSourceHubBase.normalizeValueSources(valueSources);

  const dateStrArr = [
    ...new Set(valueSources.map((vs) => Object.keys(vs.dateAmounts)).flat()),
  ].sort();
  const netWorths: { [key: string]: number } = {};
  dateStrArr.forEach((dateStr) => {
    const netWorth = valueSources
      .map((vs) => vs.dateAmounts[dateStr] || 0)
      .reduce((prev, curr) => prev + curr, 0);
    netWorths[dateStr] = netWorth;
  });
  let netWorthMedians: { [key: string]: number } = {};
  if (dateStrArr.length <= 5) {
    netWorthMedians = netWorths;
  } else {
    const netWorthSet: number[] = [];
    dateStrArr.forEach((dateStr) => {
      netWorthSet.push(netWorths[dateStr]);
      if (netWorthSet.length > 5) {
        netWorthSet.shift();
      }
      netWorthMedians[dateStr] = median(netWorthSet);
    });
  }
  const outputRowAoa: string[][] = [];
  outputRowAoa.push([
    "Date",
    "Net Worth",
    "Net Worth (5-day median, trailing)",
    ...valueSources.map((vs) => vs.name),
  ]);
  dateStrArr.forEach((dateStr) => {
    outputRowAoa.push([
      dateStr,
      (netWorths[dateStr] / 100).toFixed(2),
      (netWorthMedians[dateStr] / 100).toFixed(2),
      ...valueSources.map((vs) =>
        ((vs.dateAmounts[dateStr] || 0) / 100).toFixed(2)
      ),
    ]);
  });
  var wb = XLSX.utils.book_new();
  const netWorthSheet = XLSX.utils.aoa_to_sheet(outputRowAoa);
  XLSX.utils.book_append_sheet(wb, netWorthSheet);
  XLSX.writeFile(wb, process.env.OUTPUT_FILENAME || "boori.csv", {});
})();
