# Run Code Locally Feature

This extension now includes a **Run Local** feature that allows you to execute your LeetCode solutions locally for faster debugging without submitting to LeetCode servers.

## How to Use

### 1. Via CodeLens (Recommended)

When you open a LeetCode problem file, you'll see action buttons at the top of the file:
- **Submit** - Submit your solution to LeetCode
- **Test** - Test with LeetCode's test cases
- **Run Local** ⭐ NEW! - Run your code locally

Simply click "Run Local" to execute your code on your local machine.

### 2. Via Context Menu

Right-click on a LeetCode problem file in the Explorer or in the editor and select:
- **LeetCode > Run Code Locally**

### 3. Via Command Palette

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "LeetCode: Run Code Locally"
3. Press Enter

## Supported Languages

The Run Local feature currently supports:
- ✅ **Python** (python/python3) - Fully supported
- ✅ **JavaScript** - Fully supported
- ⚠️ **Java** - Requires JDK installed
- ⚠️ **C++** - Requires g++ compiler
- ⚠️ **Go** - Requires Go runtime
- ❌ **C#** - Not yet implemented

## Requirements

To use the Run Local feature, you need the appropriate runtime/compiler installed for your language:

- **Python**: Python 3.x or Python 2.x
- **JavaScript**: Node.js
- **Java**: JDK (Java Development Kit)
- **C++**: g++ compiler (part of GCC)
- **Go**: Go runtime

## How It Works

1. The extension reads your solution file
2. Extracts the problem metadata (language, problem ID)
3. Prompts you for test input
4. Creates a temporary test runner
5. Executes the code locally
6. Displays the results in the LeetCode output channel

## Input Format

When prompted for test input, you can provide it in two ways:

### Direct Input
- Enter test data directly in JSON-compatible format
- Examples:
  - For Two Sum: `[2,7,11,15], 9`
  - For Add Two Numbers: `[2,4,3], [5,6,4]`
  - For single values: `5`

### File Input
- Select a text file containing the test input
- The file should contain the test data in the same format

## Benefits

- ⚡ **Faster Debugging** - No need to submit to LeetCode servers
- 🔧 **Offline Development** - Work without internet connection
- 🐛 **Better Error Messages** - See local runtime errors directly
- 🔄 **Rapid Iteration** - Test multiple times quickly
- 💻 **Use Your Tools** - Debug with your local debugger

## Configuration

Add "runlocal" to your editor shortcuts to enable the CodeLens button:

```json
{
  "leetcode.editor.shortcuts": ["submit", "test", "runlocal"]
}
```

This is now the default configuration.

## Limitations

- Some complex data structures may require manual setup
- Database problems (SQL) are not supported for local execution
- Shell script problems may have platform-specific behavior
- System-dependent problems might behave differently locally

## Troubleshooting

### "Command not found" errors
Make sure the required runtime/compiler is installed and in your PATH:
- Python: `python --version` or `python3 --version`
- Node.js: `node --version`
- Java: `javac --version` and `java --version`
- g++: `g++ --version`
- Go: `go version`

### "Unable to detect LeetCode problem metadata"
Make sure your file has the proper LeetCode metadata at the top:
```
# @lc app=leetcode id=1 lang=python3
```

### Results not as expected
The local execution creates a simple test harness. For complex problems, you may need to adjust the test input format or use the standard Test/Submit buttons.

## Future Enhancements

Planned improvements:
- Support for more languages (C#, Rust, etc.)
- Better handling of complex data structures (trees, graphs)
- Custom test case management
- Batch testing with multiple test cases
- Performance profiling
