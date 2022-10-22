export const median = (arr: number[]) => {
  const sortedArr = Array.from(arr).sort((a, b) => a - b);
  const middle = Math.floor(sortedArr.length / 2);

  if (sortedArr.length % 2 === 0) {
    return (sortedArr[middle - 1] + sortedArr[middle]) / 2;
  }

  return sortedArr[middle];
};
