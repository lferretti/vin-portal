# Cross-Platform Development Guide

This guide covers the configuration and best practices for developing VIN Portal across **Windows**, **macOS**, and **Linux** environments.

## Overview

Our team uses multiple operating systems, which can lead to inconsistencies in:
- Line endings (CRLF vs LF)
- File encoding
- Code formatting
- Path handling

We've implemented several configuration files to ensure a consistent development experience across all platforms.

---

## Configuration Files

### 1. `.gitattributes` - Line Ending Normalization

**Purpose:** Ensures all text files use consistent line endings (LF) in the repository, regardless of the developer's OS.

**Key Settings:**
| Pattern | Setting | Description |
|---------|---------|-------------|
| `* text=auto eol=lf` | Auto-detect text, force LF | Default for all files |
| `*.sh text eol=lf` | Force LF | Shell scripts must use LF |
| `*.bat text eol=crlf` | Force CRLF | Windows batch files |
| `*.png binary` | Binary | Don't modify binary files |

**How it works:**
- When you commit, Git converts line endings to LF
- When you checkout, Git converts to your OS default (unless specified)
- The `eol=lf` directive ensures LF is used everywhere

### 2. `.editorconfig` - IDE-Agnostic Formatting

**Purpose:** Provides consistent editor settings across different IDEs (VS Code, WebStorm, Vim, etc.).

**Key Settings:**
```ini
charset = utf-8          # UTF-8 encoding for all files
end_of_line = lf         # Unix-style line endings
indent_style = space     # Spaces, not tabs
indent_size = 2          # 2-space indentation
trim_trailing_whitespace = true
insert_final_newline = true
```

**IDE Support:**
- **VS Code:** Install "EditorConfig for VS Code" extension
- **Cursor:** Install "EditorConfig for VS Code" extension (same as VS Code)
- **WebStorm/IntelliJ:** Built-in support
- **Vim:** Install `editorconfig-vim` plugin
- **Sublime Text:** Install EditorConfig package

### 3. `.prettierrc.json` - Code Formatting

**Purpose:** Automated code formatting to ensure consistent style.

**Key Settings:**
```json
{
  "singleQuote": true,      // Use 'single quotes'
  "trailingComma": "all",   // Trailing commas everywhere
  "printWidth": 100,        // Line width
  "tabWidth": 2,            // 2-space tabs
  "semi": true,             // Always use semicolons
  "endOfLine": "lf"         // Force LF line endings
}
```

**Critical:** The `"endOfLine": "lf"` setting prevents CRLF from being introduced.

---

## Initial Setup

### For New Team Members

After cloning the repository, run these commands to ensure proper configuration:

```bash
# 1. Clone the repository
git clone <repository-url>
cd vin-portal

# 2. Configure Git for this repository (recommended)
git config core.autocrlf false
git config core.eol lf

# 3. Install dependencies
npm install

# 4. Refresh line endings (one-time fix after adding .gitattributes)
git rm --cached -r .
git reset --hard
```

### Windows-Specific Setup

Windows users should configure Git before cloning:

```bash
# Set globally (recommended for all projects using LF)
git config --global core.autocrlf false
git config --global core.eol lf

# Or set per-repository after cloning
git config core.autocrlf false
git config core.eol lf
```

### IDE Configuration

#### VS Code (Recommended)

Install these extensions:
1. **EditorConfig for VS Code** - Reads `.editorconfig`
2. **Prettier - Code formatter** - Reads `.prettierrc.json`
3. **ESLint** - Linting support

Add to your VS Code settings (`.vscode/settings.json`):
```json
{
  "files.eol": "\n",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

#### Cursor

Cursor is built on VS Code, so it uses the same extensions and settings.

Install these extensions (same as VS Code):
1. **EditorConfig for VS Code** - Reads `.editorconfig`
2. **Prettier - Code formatter** - Reads `.prettierrc.json`
3. **ESLint** - Linting support

Add to your Cursor settings (`Settings > Open Settings (JSON)`):
```json
{
  "files.eol": "\n",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

**Note:** Cursor shares the VS Code extension marketplace, so all VS Code extensions work in Cursor.

#### WebStorm/IntelliJ

1. EditorConfig is built-in and auto-detected
2. Enable Prettier: Settings > Languages & Frameworks > JavaScript > Prettier
3. Check "Run on save"

#### Vim

1. Install `editorconfig-vim` plugin for EditorConfig support
2. For Prettier, use a plugin like `vim-prettier` or run manually:
   ```bash
   npx prettier --write <filename>
   ```
3. Add to your `.vimrc`:
   ```vim
   set fileformat=unix
   set fileformats=unix,dos
   ```

#### Sublime Text

1. Install **EditorConfig** package via Package Control
2. Install **JsPrettier** package for Prettier support
3. Configure JsPrettier to format on save:
   - Preferences > Package Settings > JsPrettier > Settings
   - Set `"auto_format_on_save": true`

---

## Troubleshooting

### Issue: "Delete CR" ESLint/Prettier Errors

**Symptom:** Linting errors like `Delete ␍ eslint(prettier/prettier)`

**Cause:** Files have CRLF line endings instead of LF.

**Fix:**
```bash
# Option 1: Let Git fix it
git add --renormalize .
git commit -m "Normalize line endings"

# Option 2: Use Prettier to fix
npx prettier --write "src/**/*.ts"

# Option 3: Manual fix for single file (VS Code)
# Click "CRLF" in bottom status bar, select "LF"
```

### Issue: Entire File Shows as Changed in Git Diff

**Symptom:** `git diff` shows every line changed even though content is the same.

**Cause:** Line ending mismatch between your local file and repository.

**Fix:**
```bash
# Reset and re-checkout with correct line endings
git rm --cached -r .
git reset --hard

# Or for specific files
git checkout -- <filename>
```

### Issue: Pre-commit Hook Fails on Windows

**Symptom:** Husky pre-commit hook fails with cryptic errors.

**Cause:** Shell script has CRLF line endings.

**Fix:**
```bash
# Verify .husky/pre-commit has LF endings
file .husky/pre-commit

# If it shows "CRLF", fix it:
git add --renormalize .husky/
git commit -m "Fix husky script line endings"
```

### Issue: npm/Node Errors About Line Endings

**Symptom:** Errors like `env: node\r: No such file or directory`

**Cause:** Shebang line has CRLF.

**Fix:**
```bash
# Convert file to LF
sed -i 's/\r$//' filename.js
# Or use dos2unix if available
dos2unix filename.js
```

### Issue: Tests Pass Locally but Fail in CI

**Symptom:** Tests work on your machine but fail in GitHub Actions.

**Possible Causes:**
1. Line ending differences in test fixtures
2. Path separator differences (`\` vs `/`)
3. Case sensitivity (macOS/Windows are case-insensitive, Linux is not)

**Fixes:**
```typescript
// Use path.join() instead of string concatenation
import * as path from 'path';
const filePath = path.join('src', 'modules', 'auth');  // Not 'src/modules/auth'

// Use path.normalize() for comparisons
const normalized = path.normalize(somePath);
```

### Issue: Files Keep Getting Marked as Modified

**Symptom:** Certain files always show as modified even after committing.

**Cause:** File permissions or line endings not matching.

**Fix:**
```bash
# Check what Git thinks changed
git diff --name-only

# If it's line endings:
git add --renormalize <filename>

# If it's permissions (common with shell scripts):
git update-index --chmod=+x <script.sh>
```

### Issue: Merge Conflicts Due to Line Endings

**Symptom:** Merge conflicts where the only difference is line endings.

**Prevention:**
```bash
# Before merging, ensure your branch has normalized line endings
git add --renormalize .
git commit -m "Normalize line endings before merge"
git merge <branch>
```

---

## Best Practices

### Do's

1. **Configure your IDE** to use LF line endings by default
2. **Run Prettier** before committing: `npx prettier --write .`
3. **Use `path.join()`** for file paths in code
4. **Test on CI** before merging - it catches platform-specific issues
5. **Install EditorConfig extension** in your IDE

### Don'ts

1. **Don't** change `core.autocrlf` to `true` globally
2. **Don't** commit files with CRLF (the pre-commit hook should catch this)
3. **Don't** use hardcoded path separators (`/` or `\`)
4. **Don't** ignore linting errors about line endings

---

## Quick Reference Commands

```bash
# Check line endings of a file
file <filename>

# Convert CRLF to LF (if dos2unix is installed)
dos2unix <filename>

# Convert using sed
sed -i 's/\r$//' <filename>

# Normalize all files in repo
git add --renormalize .

# Check Git line ending settings
git config --get core.autocrlf
git config --get core.eol

# Run Prettier on all files
npx prettier --write "src/**/*.ts"

# Check for CRLF files
find . -type f -name "*.ts" -exec file {} \; | grep CRLF
```

---

## Configuration File Locations

| File | Purpose | Auto-detected by |
|------|---------|------------------|
| `.gitattributes` | Git line ending rules | Git |
| `.editorconfig` | Editor settings | IDEs with plugin |
| `.prettierrc.json` | Code formatting | Prettier |
| `.prettierignore` | Files to skip formatting | Prettier |
| `.husky/pre-commit` | Pre-commit hooks | Husky/Git |

---

## IDE Quick Reference

| IDE | EditorConfig | Prettier | ESLint | Notes |
|-----|--------------|----------|--------|-------|
| **VS Code** | Install extension | Install extension | Install extension | Most popular choice |
| **Cursor** | Install extension | Install extension | Install extension | Same as VS Code |
| **WebStorm/IntelliJ** | Built-in | Settings > JS > Prettier | Built-in | Enable "Run on save" |
| **Vim** | `editorconfig-vim` | `vim-prettier` or manual | `ale` or `coc.nvim` | Add `.vimrc` config |
| **Sublime Text** | EditorConfig package | JsPrettier package | SublimeLinter-eslint | Via Package Control |

### Required Extensions by IDE

#### VS Code / Cursor
```
EditorConfig for VS Code
Prettier - Code formatter
ESLint
```

#### WebStorm / IntelliJ
- All built-in, just enable in settings

#### Vim
```
editorconfig-vim
vim-prettier (optional)
```

#### Sublime Text
```
EditorConfig
JsPrettier
SublimeLinter
SublimeLinter-eslint
```

---

## Need Help?

If you encounter cross-platform issues not covered here:

1. Check that all configuration files are present in your local repo
2. Verify your IDE has the required plugins installed
3. Try `git rm --cached -r . && git reset --hard` to reset line endings
4. Ask in the team channel with:
   - Your OS and version
   - IDE and version
   - The exact error message
   - Output of `git config --list | grep -E "(autocrlf|eol)"`
