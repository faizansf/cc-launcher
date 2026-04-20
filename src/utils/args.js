export function parseArgs(argv) {
  const result = { credentials: null, print: false, command: null, commandArg: null, claudeArgs: [] };

  const separatorIndex = argv.indexOf('--');
  const ourArgs = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  result.claudeArgs = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);

  for (let i = 0; i < ourArgs.length; i++) {
    if (ourArgs[i] === '--credentials' && ourArgs[i + 1]) {
      result.credentials = ourArgs[++i];
    } else if (ourArgs[i] === '--print') {
      result.print = true;
    } else if (!ourArgs[i].startsWith('-')) {
      if (!result.command) {
        result.command = ourArgs[i];
      } else if (!result.commandArg) {
        result.commandArg = ourArgs[i];
      }
    }
  }

  return result;
}
