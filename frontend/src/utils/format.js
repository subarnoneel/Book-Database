const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : null);

export const plural = (count, word, pluralWord = `${word}s`) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? word : pluralWord}`;
