# Creating and Editing Content

## The Rich Text Editor

Knowledge Network features a powerful, intuitive editor that combines the simplicity of markdown with the richness of a full-featured word processor.

## Editor Modes

### 1. Rich Text Mode (Default)
- **WYSIWYG editing**: See formatting as you type
- **Toolbar access**: All formatting options visible
- **Drag-and-drop**: Images and files
- **Best for**: Users new to markdown

### 2. Markdown Mode
- **Plain text editing**: Write in markdown syntax
- **Syntax highlighting**: Markdown elements colored
- **Live preview**: Optional split-screen preview
- **Best for**: Power users and developers

### 3. Hybrid Mode
- **Smart switching**: Type markdown, see rich text
- **Shortcuts work**: Both markdown and keyboard
- **Flexible**: Best of both worlds
- **Best for**: Most users

### Switching Modes
- Click the mode toggle in toolbar (icon: `</>`
- Keyboard shortcut: `Ctrl/Cmd + Shift + M`
- Preference setting: Set default in settings

## Text Formatting

### Basic Formatting

#### Headings
```markdown
# Heading 1 (Ctrl/Cmd + Alt + 1)
## Heading 2 (Ctrl/Cmd + Alt + 2)
### Heading 3 (Ctrl/Cmd + Alt + 3)
#### Heading 4 (Ctrl/Cmd + Alt + 4)
##### Heading 5 (Ctrl/Cmd + Alt + 5)
###### Heading 6 (Ctrl/Cmd + Alt + 6)
```

#### Text Styles
- **Bold**: `Ctrl/Cmd + B` or `**text**`
- **Italic**: `Ctrl/Cmd + I` or `*text*`
- **Underline**: `Ctrl/Cmd + U`
- **Strikethrough**: `Ctrl/Cmd + Shift + X` or `~~text~~`
- **Code**: `` `code` `` (backticks)
- **Highlight**: `Ctrl/Cmd + Shift + H` or `==text==`

#### Alignment
- Left align: `Ctrl/Cmd + L`
- Center align: `Ctrl/Cmd + E`
- Right align: `Ctrl/Cmd + R`
- Justify: `Ctrl/Cmd + J`

### Lists

#### Bullet Lists
```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```
Shortcut: `Ctrl/Cmd + Shift + 8`

#### Numbered Lists
```markdown
1. First item
2. Second item
   1. Nested item
   2. Another nested item
3. Third item
```
Shortcut: `Ctrl/Cmd + Shift + 7`

#### Checklists
```markdown
- [ ] Unchecked item
- [x] Checked item
- [ ] Another task
```
Shortcut: `Ctrl/Cmd + Shift + 9`

### Advanced Formatting

#### Quotes
```markdown
> This is a blockquote
> It can span multiple lines
>> And can be nested
```
Shortcut: `Ctrl/Cmd + Shift + .`

#### Horizontal Rules
```markdown
---
```
Or use Insert menu → Divider

#### Footnotes
```markdown
This text has a footnote[^1].

[^1]: This is the footnote content.
```

## Working with Media

### Images

#### Inserting Images

**Method 1: Drag and Drop**
1. Drag image file from computer
2. Drop into editor
3. Image uploads automatically

**Method 2: Copy and Paste**
1. Copy image (from web or screenshot)
2. Paste with `Ctrl/Cmd + V`
3. Image saves to workspace

**Method 3: Upload Button**
1. Click image icon in toolbar
2. Select "Upload from computer"
3. Choose file(s)

**Method 4: URL**
1. Click image icon in toolbar
2. Select "From URL"
3. Paste image URL

#### Image Options
- **Resize**: Drag corners to resize
- **Alignment**: Left, center, right, or inline
- **Caption**: Click below image to add
- **Alt text**: Right-click → "Edit alt text"
- **Link**: Make image clickable

### Videos

#### Embedding Videos

**YouTube/Vimeo**
1. Copy video URL
2. Paste on empty line
3. Auto-converts to embed

**Upload Video**
1. Click video icon in toolbar
2. Select file (MP4, WebM, OGG)
3. Video uploads and embeds

#### Video Settings
- **Autoplay**: Toggle in video menu
- **Controls**: Show/hide player controls
- **Loop**: Repeat playback
- **Thumbnail**: Custom preview image

### Files and Documents

#### Attachments
1. Click paperclip icon
2. Select files to attach
3. Files appear as downloadable links

#### Embedded Documents
- **PDFs**: Display inline with viewer
- **Office files**: Preview with download option
- **Code files**: Syntax highlighted display

## Tables

### Creating Tables

#### Quick Create
1. Click table icon in toolbar
2. Select grid size (up to 10x10)
3. Click to insert

#### Markdown Tables
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

### Table Operations

#### Adding Rows/Columns
- Hover over table edge
- Click "+" button that appears
- Or right-click → Insert row/column

#### Formatting
- **Bold headers**: Select and apply bold
- **Cell alignment**: Use toolbar alignment
- **Cell background**: Right-click → Cell color
- **Borders**: Table menu → Border options

#### Advanced Features
- **Merge cells**: Select multiple → Right-click → Merge
- **Sort data**: Click column header
- **Formulas**: Start cell with `=` for calculations
- **Import CSV**: Paste CSV data to create table

## Code Blocks

### Inline Code
- Wrap in single backticks: `` `code` ``
- Appears in monospace font
- Highlighted background

### Code Blocks

#### Creating Code Blocks
````markdown
```language
code here
```
````

#### Supported Languages
- JavaScript/TypeScript
- Python
- Java
- C/C++/C#
- Go
- Rust
- SQL
- HTML/CSS
- JSON/YAML
- 50+ more languages

#### Code Block Features
- **Syntax highlighting**: Automatic coloring
- **Line numbers**: Toggle in block menu
- **Copy button**: One-click copy
- **Language label**: Shows in top-right
- **Word wrap**: Toggle for long lines
- **Themes**: Multiple color schemes

## Mathematical Equations

### LaTeX Support

#### Inline Math
- Wrap in single `$`: `$E = mc^2$`
- Renders inline with text

#### Display Math
- Wrap in double `$$`:
```latex
$$
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
$$
```

#### Common Examples
- Fractions: `\frac{a}{b}`
- Square root: `\sqrt{x}`
- Summation: `\sum_{i=1}^{n}`
- Matrix: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`

### Equation Editor
1. Click equation icon (Σ) in toolbar
2. Use visual equation builder
3. Or type LaTeX directly
4. Preview updates live

## Links and Cross-References

### Creating Links

#### External Links
- **Auto-linking**: Type/paste URL, press space
- **Text links**: Select text → `Ctrl/Cmd + K`
- **Markdown**: `[text](url)`

#### Internal Links
- **To documents**: Type `[[` and search
- **To headings**: `[[document#heading]]`
- **To users**: Type `@` and username

### Link Features
- **Preview on hover**: See target content
- **Open options**: Same tab, new tab, or preview
- **Backlinks**: See what links to current document
- **Broken link detection**: Automatic checking

## Smart Features

### Auto-Completion

#### Triggers
- `@` - Mention users
- `#` - Add tags
- `[[` - Link documents
- `:` - Insert emoji
- `/` - Quick insert menu

### Templates

#### Using Templates
1. Type `/template` or click template icon
2. Search or browse templates
3. Select to insert
4. Fill in placeholders

#### Creating Templates
1. Design document structure
2. Use `{{variables}}` for placeholders
3. Save as template
4. Share with team

### AI Assistance

#### Content Suggestions
- **Continue writing**: Press Tab at paragraph end
- **Rephrase**: Select text → AI menu → Rephrase
- **Summarize**: Select text → AI menu → Summarize
- **Translate**: Select text → AI menu → Translate

#### Smart Formatting
- **Auto-lists**: Start with `-` or `1.`
- **Smart quotes**: Automatic curly quotes
- **Auto-capitalization**: Sentence starts
- **Link suggestions**: Based on context

## Collaboration Features

### Real-Time Editing

#### Presence Indicators
- **Cursors**: See where others are typing
- **Selections**: Colored highlights
- **Names**: Hover to see who's editing
- **Status**: Typing, selecting, idle

#### Conflict Resolution
- **Auto-merge**: Most changes merge automatically
- **Conflict dialog**: Choose version for conflicts
- **Version history**: Restore previous versions
- **Branching**: Create document branches

### Comments and Suggestions

#### Adding Comments
1. Select text
2. Click comment icon or press `Ctrl/Cmd + Alt + M`
3. Type comment
4. Press Enter to post

#### Suggestion Mode
1. Enable "Suggesting" mode
2. Make edits (shown as suggestions)
3. Others can accept/reject
4. Track changes visible

## Document Management

### Saving and Versioning

#### Auto-Save
- **Frequency**: Every 2 seconds of inactivity
- **Indicator**: "Saved" in status bar
- **Offline**: Queues saves for sync
- **Conflicts**: Automatic resolution

#### Manual Versions
1. File menu → "Save version"
2. Name the version
3. Add description (optional)
4. Access in version history

### Organizing Content

#### Document Properties
- **Title**: Click to edit
- **Tags**: Add for categorization
- **Status**: Draft/Review/Published
- **Permissions**: Control access

#### Moving Documents
- Drag to new collection
- Right-click → "Move to"
- Bulk select for multiple

### Exporting Content

#### Export Formats
- **PDF**: Preserves formatting
- **Word**: `.docx` format
- **Markdown**: `.md` with assets
- **HTML**: Web-ready format

#### Export Options
1. File menu → Export
2. Choose format
3. Configure options:
   - Include images
   - Include comments
   - Page settings (PDF)
4. Download file

## Keyboard Shortcuts

### Essential Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Save | `Ctrl + S` | `Cmd + S` |
| Undo | `Ctrl + Z` | `Cmd + Z` |
| Redo | `Ctrl + Y` | `Cmd + Shift + Z` |
| Find | `Ctrl + F` | `Cmd + F` |
| Replace | `Ctrl + H` | `Cmd + H` |

### Formatting Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Bold | `Ctrl + B` | `Cmd + B` |
| Italic | `Ctrl + I` | `Cmd + I` |
| Link | `Ctrl + K` | `Cmd + K` |
| Code | `Ctrl + E` | `Cmd + E` |

### Navigation Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Start of line | `Home` | `Cmd + ←` |
| End of line | `End` | `Cmd + →` |
| Start of doc | `Ctrl + Home` | `Cmd + ↑` |
| End of doc | `Ctrl + End` | `Cmd + ↓` |

## Best Practices

### Content Structure
1. **Use headings**: Create logical hierarchy
2. **Break up text**: Short paragraphs
3. **Use lists**: For scannable content
4. **Add visuals**: Support text with images

### Collaboration
1. **Communicate**: Use comments for feedback
2. **Track changes**: Enable for reviews
3. **Version regularly**: Create restore points
4. **Set permissions**: Control access appropriately

### Performance
1. **Optimize images**: Resize before uploading
2. **Limit embeds**: Too many slow loading
3. **Clean formatting**: Remove unnecessary styles
4. **Archive old content**: Move to cold storage

---

[← Previous: Interface Overview](./interface-overview.md) | [Next: Organization →](./organization.md)