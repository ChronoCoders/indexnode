"""String-aware comment stripper. Preserves comments containing safety/invariant/workaround keywords."""
import os
import re
import sys
from pathlib import Path

KEEP_RE = re.compile(
    r"(?i)\b(safety|invariant|workaround|hack|fixme|race|security|must |must not|never |do not|careful|side[- ]?effect|hidden|subtle|gotcha|warning|reentr|nonReentr|overflow|underflow|precision|rounding|timing|attack|exploit|csrf|xss|injection|leak)\b"
)


def should_keep(comment_text: str) -> bool:
    return bool(KEEP_RE.search(comment_text))


def strip_c_like(src: str, line_comment: str = "//", block_open: str = "/*", block_close: str = "*/") -> str:
    """For Rust/Solidity/TS/JS/CSS. Handles strings, char, raw strings (Rust), template literals (TS/JS), regex literals."""
    out = []
    i = 0
    n = len(src)
    lo = len(block_open)
    lc = len(block_close)
    ll = len(line_comment)

    def at(s: str) -> bool:
        return src.startswith(s, i)

    while i < n:
        c = src[i]
        # Rust raw string: r#*"..."#*
        if c == 'r' and i + 1 < n and (src[i+1] == '"' or src[i+1] == '#'):
            j = i + 1
            hashes = 0
            while j < n and src[j] == '#':
                hashes += 1
                j += 1
            if j < n and src[j] == '"':
                end_mark = '"' + '#' * hashes
                k = src.find(end_mark, j + 1)
                if k == -1:
                    out.append(src[i:]); return ''.join(out)
                out.append(src[i:k + len(end_mark)])
                i = k + len(end_mark)
                continue
        # b"..." byte string (Rust)
        if c == 'b' and i + 1 < n and src[i+1] == '"':
            j = i + 2
            while j < n:
                if src[j] == '\\':
                    j += 2; continue
                if src[j] == '"':
                    j += 1; break
                j += 1
            out.append(src[i:j]); i = j; continue
        # String literal "..."
        if c == '"':
            j = i + 1
            while j < n:
                if src[j] == '\\':
                    j += 2; continue
                if src[j] == '"':
                    j += 1; break
                j += 1
            out.append(src[i:j]); i = j; continue
        # Single-quoted (char in Rust/Solidity, string in TS/JS)
        if c == "'":
            j = i + 1
            while j < n:
                if src[j] == '\\':
                    j += 2; continue
                if src[j] == "'":
                    j += 1; break
                if src[j] == '\n':
                    break
                j += 1
            out.append(src[i:j]); i = j; continue
        # Template literal `...` with ${...} (TS/JS only — safe to handle generally; Rust/Solidity don't use backticks in code)
        if c == '`':
            j = i + 1
            depth = 0
            while j < n:
                if src[j] == '\\':
                    j += 2; continue
                if depth == 0 and src[j] == '`':
                    j += 1; break
                if src[j] == '$' and j + 1 < n and src[j+1] == '{':
                    depth += 1; j += 2; continue
                if depth > 0 and src[j] == '}':
                    depth -= 1; j += 1; continue
                j += 1
            out.append(src[i:j]); i = j; continue
        # Line comment
        if at(line_comment):
            j = src.find('\n', i)
            if j == -1: j = n
            text = src[i:j]
            if should_keep(text):
                out.append(text); i = j; continue
            # Remove the comment. If line is now whitespace-only, drop the trailing newline too.
            before_nl = src.rfind('\n', 0, i) + 1
            between = src[before_nl:i]
            if between.strip() == '':
                # Whole line is just whitespace + comment. Drop it including its newline.
                # Walk back any trailing whitespace already in out.
                tail = ''
                while out and out[-1] and out[-1][-1] in ' \t':
                    tail = out[-1][-1] + tail
                    out[-1] = out[-1][:-1]
                    if out[-1] == '':
                        out.pop()
                i = j + 1 if j < n else n
            else:
                # Comment after code on same line. Strip trailing whitespace before it.
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '':
                        out.pop()
                i = j
            continue
        # Block comment
        if at(block_open):
            j = src.find(block_close, i + lo)
            if j == -1:
                # Unterminated — leave as is.
                out.append(src[i:]); return ''.join(out)
            end = j + lc
            text = src[i:end]
            if should_keep(text):
                out.append(text); i = end; continue
            # Drop. If the block is the only thing on its line(s), drop surrounding whitespace + one newline.
            before_nl = src.rfind('\n', 0, i) + 1
            after_end = end
            while after_end < n and src[after_end] in ' \t':
                after_end += 1
            line_after = after_end < n and src[after_end] == '\n'
            between = src[before_nl:i]
            if between.strip() == '' and (line_after or after_end == n):
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '':
                        out.pop()
                i = after_end + 1 if line_after else after_end
            else:
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '':
                        out.pop()
                i = end
            continue
        out.append(c); i += 1

    return ''.join(out)


def strip_sql(src: str) -> str:
    out = []
    i = 0
    n = len(src)
    while i < n:
        c = src[i]
        # Dollar-quoted string $tag$ ... $tag$
        if c == '$':
            m = re.match(r"\$([A-Za-z_][A-Za-z0-9_]*)?\$", src[i:])
            if m:
                tag = m.group(0)
                end = src.find(tag, i + len(tag))
                if end == -1:
                    out.append(src[i:]); return ''.join(out)
                out.append(src[i:end + len(tag)])
                i = end + len(tag); continue
        # 'string' with '' escape
        if c == "'":
            j = i + 1
            while j < n:
                if src[j] == "'":
                    if j + 1 < n and src[j+1] == "'":
                        j += 2; continue
                    j += 1; break
                j += 1
            out.append(src[i:j]); i = j; continue
        # "identifier" — treat like string
        if c == '"':
            j = src.find('"', i + 1)
            if j == -1: j = n
            else: j += 1
            out.append(src[i:j]); i = j; continue
        # -- line comment
        if src.startswith('--', i):
            j = src.find('\n', i)
            if j == -1: j = n
            text = src[i:j]
            if should_keep(text):
                out.append(text); i = j; continue
            before_nl = src.rfind('\n', 0, i) + 1
            if src[before_nl:i].strip() == '':
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '': out.pop()
                i = j + 1 if j < n else n
            else:
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '': out.pop()
                i = j
            continue
        # /* ... */ (Postgres supports nesting)
        if src.startswith('/*', i):
            depth = 1
            j = i + 2
            while j < n and depth > 0:
                if src.startswith('/*', j):
                    depth += 1; j += 2
                elif src.startswith('*/', j):
                    depth -= 1; j += 2
                else:
                    j += 1
            text = src[i:j]
            if should_keep(text):
                out.append(text); i = j; continue
            before_nl = src.rfind('\n', 0, i) + 1
            after = j
            while after < n and src[after] in ' \t':
                after += 1
            line_after = after < n and src[after] == '\n'
            if src[before_nl:i].strip() == '' and (line_after or after == n):
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '': out.pop()
                i = after + 1 if line_after else after
            else:
                while out and out[-1] and out[-1][-1] in ' \t':
                    out[-1] = out[-1][:-1]
                    if out[-1] == '': out.pop()
                i = j
            continue
        # # line comment in shell-like contexts? Not in SQL — skip.
        out.append(c); i += 1
    return ''.join(out)


def strip_shell(src: str) -> str:
    """Strip # line comments but keep shebangs."""
    out_lines = []
    lines = src.split('\n')
    for idx, line in enumerate(lines):
        if idx == 0 and line.startswith('#!'):
            out_lines.append(line); continue
        # Find # not inside quotes
        i = 0
        in_s = None
        cut = -1
        while i < len(line):
            c = line[i]
            if in_s:
                if c == '\\' and in_s == '"':
                    i += 2; continue
                if c == in_s:
                    in_s = None
                i += 1; continue
            if c in ('"', "'"):
                in_s = c; i += 1; continue
            if c == '#' and (i == 0 or line[i-1] in ' \t'):
                cut = i; break
            i += 1
        if cut == -1:
            out_lines.append(line)
        else:
            text = line[cut:]
            if should_keep(text):
                out_lines.append(line)
            else:
                stripped = line[:cut].rstrip()
                if stripped:
                    out_lines.append(stripped)
                # else drop entirely
    # Collapse runs of blank lines into max 1.
    cleaned = []
    blank = False
    for ln in out_lines:
        if ln.strip() == '':
            if not blank:
                cleaned.append('')
            blank = True
        else:
            cleaned.append(ln); blank = False
    return '\n'.join(cleaned)


def collapse_blanks(src: str) -> str:
    """Collapse 3+ consecutive blank lines into 2."""
    return re.sub(r'\n{3,}', '\n\n', src)


HANDLERS = {
    '.rs': lambda s: collapse_blanks(strip_c_like(s)),
    '.sol': lambda s: collapse_blanks(strip_c_like(s)),
    '.ts': lambda s: collapse_blanks(strip_c_like(s)),
    '.tsx': lambda s: collapse_blanks(strip_c_like(s)),
    '.js': lambda s: collapse_blanks(strip_c_like(s)),
    '.jsx': lambda s: collapse_blanks(strip_c_like(s)),
    '.mjs': lambda s: collapse_blanks(strip_c_like(s)),
    '.css': lambda s: collapse_blanks(strip_c_like(s)),
    '.sql': lambda s: collapse_blanks(strip_sql(s)),
    '.sh': lambda s: collapse_blanks(strip_shell(s)),
}


def process(path: Path) -> bool:
    ext = path.suffix.lower()
    if ext not in HANDLERS:
        return False
    try:
        src = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        return False
    new = HANDLERS[ext](src)
    if new != src:
        path.write_text(new, encoding='utf-8', newline='\n')
        return True
    return False


def main():
    roots = sys.argv[1:] or ['.']
    SKIP_DIRS = {'.git', 'node_modules', 'target', 'lib', 'out', '.next', 'dist', 'build', 'cache'}
    changed = 0
    seen = 0
    for root in roots:
        root_p = Path(root)
        if root_p.is_file():
            if root_p.suffix.lower() in HANDLERS:
                seen += 1
                if process(root_p):
                    changed += 1
                    print(f"stripped: {root_p}")
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for f in filenames:
                p = Path(dirpath) / f
                if p.suffix.lower() in HANDLERS:
                    seen += 1
                    if process(p):
                        changed += 1
                        print(f"stripped: {p}")
    print(f"\n{changed}/{seen} files modified.")


if __name__ == '__main__':
    main()
