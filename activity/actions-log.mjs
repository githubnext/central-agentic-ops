function message(strings, values) {
  return strings.reduce((text, part, index) => (
    text + part + (index < values.length ? String(values[index]) : "")
  ), "");
}

function commandMacro(command) {
  return (strings, ...values) => {
    const text = message(strings, values)
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.log(`::${command}::${text}`);
  };
}

export const actionsLog = {
  info(strings, ...values) {
    console.log(message(strings, values));
  },
  debug: commandMacro("debug"),
  notice: commandMacro("notice"),
  warning: commandMacro("warning"),
  error: commandMacro("error"),
  group: commandMacro("group"),
  endGroup() {
    console.log("::endgroup::");
  },
};
