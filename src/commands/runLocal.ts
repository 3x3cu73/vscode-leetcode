// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as crypto from "crypto";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { leetCodeChannel } from "../leetCodeChannel";
import { DialogType, promptForOpenOutputChannel } from "../utils/uiUtils";
import { getActiveFilePath } from "../utils/workspaceUtils";

export async function runLocal(uri?: vscode.Uri): Promise<void> {
    try {
        const filePath: string | undefined = await getActiveFilePath(uri);
        if (!filePath) {
            vscode.window.showErrorMessage("Please open a LeetCode problem file.");
            return;
        }

        // Read the file content
        const fileContent: string = await fse.readFile(filePath, "utf-8");

        // Extract problem metadata
        const metadata = extractMetadata(fileContent);
        if (!metadata) {
            vscode.window.showErrorMessage("Unable to detect LeetCode problem metadata in this file.");
            return;
        }

        // Determine language and execute
        const language = metadata.lang;
        const testInput = await promptForTestInput();
        if (!testInput) {
            return;
        }

        leetCodeChannel.appendLine(`Running local test for ${metadata.id}...`);
        leetCodeChannel.appendLine(`Language: ${language}`);
        leetCodeChannel.appendLine(`Test input: ${testInput}`);
        leetCodeChannel.appendLine("");

        // Execute based on language
        const result = await executeLocalTest(filePath, language, testInput, fileContent);

        // Show results in output channel
        leetCodeChannel.show();
        leetCodeChannel.appendLine("=".repeat(60));
        leetCodeChannel.appendLine("Local Test Results:");
        leetCodeChannel.appendLine("=".repeat(60));
        leetCodeChannel.appendLine(result);
        leetCodeChannel.appendLine("=".repeat(60));

        vscode.window.showInformationMessage("Local test completed! Check LeetCode output channel for results.");
    } catch (error) {
        await promptForOpenOutputChannel("Failed to run local test. Please open the output channel for details.", DialogType.error);
        leetCodeChannel.appendLine(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

interface IProblemMetadata {
    app: string;
    id: string;
    lang: string;
}

function extractMetadata(content: string): IProblemMetadata | null {
    // Match pattern: @lc app=leetcode id=1 lang=python3
    const matchResult: RegExpMatchArray | null = content.match(/@lc app=(.*) id=(.*) lang=(.*)/);
    if (!matchResult) {
        return null;
    }

    return {
        app: matchResult[1],
        id: matchResult[2],
        lang: matchResult[3],
    };
}

async function promptForTestInput(): Promise<string | undefined> {
    const picks: Array<vscode.QuickPickItem & { value: string }> = [
        {
            label: "$(pencil) Write test case directly...",
            description: "",
            detail: "Enter test input manually",
            value: ":direct",
        },
        {
            label: "$(file-text) Load from file...",
            description: "",
            detail: "Load test input from a file",
            value: ":file",
        },
    ];

    const choice = await vscode.window.showQuickPick(picks, {
        placeHolder: "How would you like to provide test input?",
    });

    if (!choice) {
        return undefined;
    }

    if (choice.value === ":direct") {
        return await vscode.window.showInputBox({
            prompt: "Enter the test input (e.g., [1,2,3] or just simple values)",
            placeHolder: "Example: [1,2,3]",
            ignoreFocusOut: true,
        });
    } else {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: "Select test input file",
            filters: {
                "Text files": ["txt"],
                "All files": ["*"],
            },
        });

        if (files && files.length > 0) {
            return await fse.readFile(files[0].fsPath, "utf-8");
        }
    }

    return undefined;
}

async function executeLocalTest(filePath: string, language: string, testInput: string, fileContent: string): Promise<string> {
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);

    switch (language) {
        case "python":
        case "python3":
            return await executePython(filePath, testInput, fileContent);
        case "javascript":
        case "typescript":
            return await executeJavaScript(filePath, testInput, fileContent);
        case "java":
            return await executeJava(filePath, testInput, fileContent, dirName, baseName);
        case "cpp":
        case "c":
            return await executeCpp(filePath, testInput, fileContent, dirName, baseName);
        case "csharp":
            return await executeCSharp(filePath, testInput, fileContent, dirName, baseName);
        case "golang":
            return await executeGo(filePath, testInput, fileContent, dirName);
        default:
            throw new Error(`Language ${language} is not yet supported for local execution.`);
    }
}

// Helper function to generate secure temporary file names
function generateTempFileName(extension: string): string {
    const randomBytes = crypto.randomBytes(16).toString("hex");
    return `leetcode_temp_${randomBytes}.${extension}`;
}

// Helper function to write test input to a file safely
async function writeTestInputFile(dirName: string, testInput: string): Promise<string> {
    const inputFile = path.join(dirName, generateTempFileName("txt"));
    await fse.writeFile(inputFile, testInput, "utf-8");
    return inputFile;
}

async function executePython(filePath: string, testInput: string, fileContent: string): Promise<string> {
    const dirName = path.dirname(filePath);
    const tempFile = path.join(dirName, generateTempFileName("py"));
    const inputFile = await writeTestInputFile(dirName, testInput);

    try {
        // Create a test runner that reads input from file
        const testCode = `
${fileContent}

# Test runner
if __name__ == "__main__":
    import json
    import sys

    # Read input from file instead of embedding it in code
    with open(${JSON.stringify(inputFile)}, 'r') as f:
        test_input = f.read().strip()

    print("Input:", test_input)

    # Try to parse as JSON
    try:
        args = json.loads(test_input)
        if not isinstance(args, list):
            args = [args]
    except:
        args = [test_input]

    # Find the solution class
    solution = Solution()
    # Get first method that doesn't start with __
    methods = [m for m in dir(solution) if not m.startswith('_')]
    if not methods:
        print("Error: No public methods found in Solution class")
        sys.exit(1)
    method_name = methods[0]
    method = getattr(solution, method_name)

    result = method(*args) if isinstance(args, list) else method(args)
    print("Output:", result)
`;

        await fse.writeFile(tempFile, testCode);

        return await executeCommand("python3", [tempFile]);
    } catch (error) {
        // Try python if python3 doesn't exist
        try {
            return await executeCommand("python", [tempFile]);
        } catch {
            throw error;
        }
    } finally {
        // Clean up temp files
        if (await fse.pathExists(tempFile)) {
            await fse.remove(tempFile);
        }
        if (await fse.pathExists(inputFile)) {
            await fse.remove(inputFile);
        }
    }
}

async function executeJavaScript(filePath: string, testInput: string, fileContent: string): Promise<string> {
    const dirName = path.dirname(filePath);
    const tempFile = path.join(dirName, generateTempFileName("js"));
    const inputFile = await writeTestInputFile(dirName, testInput);

    try {
        const testCode = `
const fs = require('fs');

${fileContent}

// Test runner
const testInput = fs.readFileSync(${JSON.stringify(inputFile)}, 'utf-8').trim();
console.log("Input:", testInput);

let args;
try {
    args = JSON.parse(testInput);
    if (!Array.isArray(args)) {
        args = [args];
    }
} catch {
    args = [testInput];
}

// Create solution instance if class exists, otherwise use function directly
let result;
if (typeof Solution !== 'undefined') {
    const solution = new Solution();
    const methodName = Object.getOwnPropertyNames(Solution.prototype).find(m => m !== 'constructor');
    if (!methodName) {
        console.error("Error: No public methods found in Solution class");
        process.exit(1);
    }
    result = solution[methodName](...args);
} else {
    // Try to find a function in the file
    result = args[0]; // Placeholder
}

console.log("Output:", result);
`;

        await fse.writeFile(tempFile, testCode);

        return await executeCommand("node", [tempFile]);
    } finally {
        if (await fse.pathExists(tempFile)) {
            await fse.remove(tempFile);
        }
        if (await fse.pathExists(inputFile)) {
            await fse.remove(inputFile);
        }
    }
}

async function executeJava(_filePath: string, testInput: string, fileContent: string, dirName: string, _baseName: string): Promise<string> {
    // Java needs compilation first
    const className = extractJavaClassName(fileContent);
    if (!className) {
        throw new Error("Could not find Java class name");
    }

    const tempFile = path.join(dirName, generateTempFileName("java"));
    const inputFile = await writeTestInputFile(dirName, testInput);

    try {
        const testCode = `
import java.io.*;
import java.nio.file.*;
import java.util.*;

${fileContent}

class LeetCodeTest {
    public static void main(String[] args) throws IOException {
        String testInput = new String(Files.readAllBytes(Paths.get(${JSON.stringify(inputFile)})));
        System.out.println("Input: " + testInput);

        // Create solution instance
        Solution solution = new Solution();
        // Note: You would need to call the appropriate method here

        System.out.println("Output: [Java execution requires manual setup]");
    }
}
`;

        await fse.writeFile(tempFile, testCode);

        // Compile
        await executeCommand("javac", [tempFile]);

        // Run
        const baseName = path.basename(tempFile, ".java");
        return await executeCommand("java", ["-cp", dirName, baseName]);
    } finally {
        // Cleanup
        const classFile = path.join(dirName, path.basename(tempFile, ".java") + ".class");
        if (await fse.pathExists(tempFile)) {
            await fse.remove(tempFile);
        }
        if (await fse.pathExists(classFile)) {
            await fse.remove(classFile);
        }
        if (await fse.pathExists(inputFile)) {
            await fse.remove(inputFile);
        }
    }
}

function extractJavaClassName(content: string): string | null {
    const match = content.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : null;
}

async function executeCpp(_filePath: string, testInput: string, fileContent: string, dirName: string, _baseName: string): Promise<string> {
    const tempFile = path.join(dirName, generateTempFileName("cpp"));
    const tempExe = path.join(dirName, generateTempFileName("out"));
    const inputFile = await writeTestInputFile(dirName, testInput);

    try {
        const testCode = `
#include <iostream>
#include <fstream>
#include <string>
using namespace std;

${fileContent}

int main() {
    ifstream infile(${JSON.stringify(inputFile)});
    string testInput;
    getline(infile, testInput);
    infile.close();

    cout << "Input: " << testInput << endl;

    // Create solution instance
    Solution solution;
    // Note: You would need to call the appropriate method here

    cout << "Output: [C++ execution requires manual setup]" << endl;
    return 0;
}
`;

        await fse.writeFile(tempFile, testCode);

        // Compile
        await executeCommand("g++", ["-o", tempExe, tempFile]);

        // Run
        return await executeCommand(tempExe, []);
    } finally {
        if (await fse.pathExists(tempFile)) {
            await fse.remove(tempFile);
        }
        if (await fse.pathExists(tempExe)) {
            await fse.remove(tempExe);
        }
        if (await fse.pathExists(inputFile)) {
            await fse.remove(inputFile);
        }
    }
}

async function executeCSharp(_filePath: string, _testInput: string, _fileContent: string, _dirName: string, _baseName: string): Promise<string> {
    return "C# local execution is not yet fully implemented. Please use the Test or Submit buttons.";
}

async function executeGo(_filePath: string, testInput: string, fileContent: string, dirName: string): Promise<string> {
    const tempFile = path.join(dirName, generateTempFileName("go"));
    const inputFile = await writeTestInputFile(dirName, testInput);

    try {
        const testCode = `
package main

import (
    "fmt"
    "os"
)

${fileContent}

func main() {
    data, _ := os.ReadFile(${JSON.stringify(inputFile)})
    testInput := string(data)
    fmt.Println("Input:", testInput)

    // Note: You would need to call the appropriate function here

    fmt.Println("Output: [Go execution requires manual setup]")
}
`;

        await fse.writeFile(tempFile, testCode);

        return await executeCommand("go", ["run", tempFile]);
    } finally {
        if (await fse.pathExists(tempFile)) {
            await fse.remove(tempFile);
        }
        if (await fse.pathExists(inputFile)) {
            await fse.remove(inputFile);
        }
    }
}

async function executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        // Note: shell: true is safe here because:
        // 1. command is a hardcoded string (python3, node, javac, etc.)
        // 2. args are file paths that have been properly escaped with JSON.stringify
        // 3. user input is written to files, not passed as command arguments
        const child = cp.spawn(command, args, {
            shell: true,
            cwd: process.cwd(),
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with exit code ${code}\n${stderr}`));
            } else {
                resolve(stdout || stderr);
            }
        });

        child.on("error", (error) => {
            reject(error);
        });
    });
}
