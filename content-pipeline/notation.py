"""
Notation for W1: Word equations and raised or lowered text, read as plain Unicode.

The app shows questions as plain text, so notation has to survive as characters:
H₂SO₄, Fe³⁺, x², 10⁻³, ¼, √(x + 1), ²³⁵₉₂U. Before this existed the extractor
read none of it. Word equations were dropped outright ("Qd = 20 − ¼p" came out
as "20 ─ p"), and raised or lowered runs were flattened ("4x³" became "4x3",
"H₂SO₄" became "H2SO4"). Counted across the UTME files on 2026-09-25: 826 Word
equations and about 1,650 raised or lowered runs, almost all in Mathematics,
Chemistry and Physics.

Rules, each from something seen in the real files:

* A raised or lowered run maps to Unicode only when every character in it has a
  Unicode form. Otherwise it stays plain: a wrong-looking "Qd" is readable, a
  half-converted one is not.
* Ordinals stay plain. Government and Literature raise "th" and "st" ("19th
  century"), which is typography, not notation.
* A raised or lowered run with nothing before it to attach to stays plain. The
  Biology file has a question number "35." set in superscript by accident.
* A number spelled out in a subscript is a number base: "121three" is 121 in
  base three, written 121₃.
* In running text, a lowered run of letters or brackets stays plain. Chemistry
  lowers state symbols a character at a time, so converting what can be
  converted gave "HCl₍aq₎"; plain gives "HCl(aq)". It also keeps "qd" and "qs"
  alike, where Unicode has a subscript s and no subscript d. Inside a Word
  equation, where a subscript is always deliberate, letters do convert.
* A denominator of more than one factor is bracketed: q²/(4πε₀r), never
  q²/4πε₀r, which reads as (q²/4)πε₀r.
* The box-drawing character U+2500 is used as a minus sign throughout the
  Mathematics file. It is read as U+2212, the minus sign.
* "#" before a number is the naira sign, typed on a keyboard without one:
  "#20" is ₦20.
"""

import re
import xml.etree.ElementTree as ET

M = '{http://schemas.openxmlformats.org/officeDocument/2006/math}'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

SUP = dict(zip('0123456789+-−=()nixyabcdefghjklmoprstuvwz',
               '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁼⁽⁾ⁿⁱˣʸᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷᶻ'))
SUB = dict(zip('0123456789+-−=()aehijklmnoprstuvx°',
               '₀₁₂₃₄₅₆₇₈₉₊₋₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ₀'))   # ° as a subscript is a nought: ε° is ε₀
ORDINALS = {'st', 'nd', 'rd', 'th'}
NUMBER_WORDS = {'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7',
                'eight': '8', 'nine': '9', 'ten': '10', 'eleven': '11', 'twelve': '12', 'sixteen': '16'}
VULGAR = {('1', '2'): '½', ('1', '3'): '⅓', ('2', '3'): '⅔', ('1', '4'): '¼', ('3', '4'): '¾',
          ('1', '5'): '⅕', ('2', '5'): '⅖', ('3', '5'): '⅗', ('4', '5'): '⅘', ('1', '6'): '⅙',
          ('5', '6'): '⅚', ('1', '7'): '⅐', ('1', '8'): '⅛', ('3', '8'): '⅜', ('5', '8'): '⅝',
          ('7', '8'): '⅞', ('1', '9'): '⅑', ('1', '10'): '⅒'}
MINUS = '−'


def _map(s, table):
    """Unicode form of s, or None if any non-space character has none."""
    core = s.strip()
    if not core or any(c not in table for c in core):
        return None
    lead = s[:len(s) - len(s.lstrip())]
    trail = s[len(s.rstrip()):]
    return lead + ''.join(table[c] for c in core) + trail


def sup(s):
    return _map(s, SUP)


def sub(s):
    w = s.strip().lower()
    if w in NUMBER_WORDS:
        return _map(NUMBER_WORDS[w], SUB)
    return _map(s, SUB)


def script_run(text, kind, before):
    """A raised ('superscript') or lowered ('subscript') run in running text.
    `before` is the text already read in this paragraph."""
    if not text.strip():
        return text
    if not before or before[-1].isspace():
        return text                       # nothing to attach to: typography, not notation
    if kind == 'superscript' and text.strip().lower() in ORDINALS:
        return text
    if kind == 'subscript':
        # Digits and signs convert; letters and brackets stay as typed. One run
        # can hold both: Chemistry lowers "2(s)" in one go, which is Ca(OH)₂(s).
        w = text.strip().lower()
        if w in NUMBER_WORDS:
            return sub(w)
        return ''.join(SUB[c] if c in '0123456789+−=°' else c for c in text.replace('-', MINUS))
    got = sup(text.replace('-', MINUS))
    return got if got is not None else text


# ------------------------------------------------------------------ Word equations

def _simple(s):
    """True when s reads as one token, so it needs no brackets around it."""
    return bool(re.fullmatch(r'[\w.,√πθ°⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ⁿ]+', s))


def _wrap(s):
    return s if _simple(s) else f'({s})'


def _wrap_den(s):
    """A denominator stands bare only when it is one factor: a number, one
    symbol with its scripts, a root, or a differential like dx."""
    one = (r'[\d.,]+|[A-Za-zα-ωΑ-Ω][⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉ₙₒ]*|d[a-z]|√[\w.]+|√\(.*\)')
    return s if re.fullmatch(one, s) else f'({s})'


def _prop(el, name, default=None):
    """Value of a property like <m:dPr><m:begChr m:val="["/></m:dPr>."""
    for pr in el:
        if pr.tag.endswith('Pr'):
            p = pr.find(M + name)
            if p is not None:
                return p.get(M + 'val', default if default is not None else '')
    return default


def _kids(el, name):
    return [c for c in el if c.tag == M + name]


def _text(el):
    return ''.join(render(c) for c in el if not c.tag.endswith('Pr'))


def _one(el, name):
    k = el.find(M + name)
    return _text(k) if k is not None else ''


def _script(base, s, table_fn, mark):
    if not s:
        return base
    got = table_fn(s)
    return base + (got if got is not None else f'{mark}({s})' if len(s) > 1 else f'{mark}{s}')


def render(el):
    tag = el.tag
    if tag == M + 'r':
        t = ''.join(x.text or '' for x in el.iter(M + 't'))
        return t.replace('-', MINUS)
    if tag == M + 't':
        return (el.text or '').replace('-', MINUS)
    if tag == M + 'f':
        num, den = _one(el, 'num').strip(), _one(el, 'den').strip()
        if (num, den) in VULGAR and _prop(el, 'type', 'bar') == 'bar':
            return VULGAR[(num, den)]
        return f'{_wrap(num)}/{_wrap_den(den)}'
    if tag == M + 'sSup':
        return _script(_one(el, 'e'), _one(el, 'sup'), sup, '^')
    if tag == M + 'sSub':
        return _script(_one(el, 'e'), _one(el, 'sub'), sub, '_')
    if tag == M + 'sSubSup':
        return _script(_script(_one(el, 'e'), _one(el, 'sub'), sub, '_'), _one(el, 'sup'), sup, '^')
    if tag == M + 'sPre':
        pre = _script('', _one(el, 'sup'), sup, '^')
        pre = _script(pre, _one(el, 'sub'), sub, '_')
        return pre + _one(el, 'e')
    if tag == M + 'rad':
        deg, body = _one(el, 'deg').strip(), _one(el, 'e').strip()
        sign = {'': '√', '2': '√', '3': '∛', '4': '∜'}.get(deg)
        if sign is None:
            sign = (sup(deg) or f'({deg})') + '√'
        return sign + _wrap(body)
    if tag == M + 'd':
        beg, end, sep = _prop(el, 'begChr', '('), _prop(el, 'endChr', ')'), _prop(el, 'sepChr', '|')
        return beg + sep.join(_text(e) for e in _kids(el, 'e')) + end
    if tag == M + 'nary':
        op = _prop(el, 'chr', '∫')
        lo, hi = _one(el, 'sub'), _one(el, 'sup')
        head = _script(_script(op, lo, sub, '_'), hi, sup, '^')
        return head + ' ' + _one(el, 'e')
    if tag == M + 'func':
        name, arg = _one(el, 'fName').strip(), _one(el, 'e').strip()
        return name + ('' if arg.startswith('(') else ' ') + arg
    if tag == M + 'acc':
        mark = _prop(el, 'chr', '̂')
        base = _one(el, 'e')
        return base + mark if len(base) == 1 else f'{base}{mark}'
    if tag == M + 'bar':
        mark = '̲' if _prop(el, 'pos', 'top') == 'bot' else '̅'
        return ''.join(c + mark for c in _one(el, 'e'))
    if tag == M + 'groupChr':
        mark, body = _prop(el, 'chr', ''), _one(el, 'e')
        return f'{mark}({body})' if mark and body else (mark or body)
    if tag in (M + 'limLow', M + 'limUpp'):
        return f"{_one(el, 'e')}({_one(el, 'lim')})"
    if tag == M + 'eqArr':
        return '; '.join(_text(e) for e in _kids(el, 'e'))
    if tag == M + 'm':
        rows = ['  '.join(_text(e) for e in _kids(r, 'e')) for r in _kids(el, 'mr')]
        return '; '.join(rows)
    if tag == M + 'phant':
        return '' if _prop(el, 'show', 'on') in ('off', '0', 'false') else _one(el, 'e')
    if tag.endswith('Pr') or tag == W + 'rPr':
        return ''
    return _text(el)          # oMath, oMathPara, e, num, box, borderBox and other containers


def math_text(snippet, ns_decls):
    """Plain Unicode for one <m:oMath> or <m:oMathPara> snippet."""
    try:
        root = ET.fromstring(f'<root {ns_decls}>{snippet}</root>')
    except ET.ParseError:
        return re.sub(r'<[^>]+>', '', snippet)      # unreadable: its bare text, as before
    return ''.join(render(c) for c in root)


_UNSUP = dict(zip('⁰¹²³⁴⁵⁶⁷⁸⁹ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁽⁾⁻⁺',
                   '0123456789abcdefghijklmnoprstuvwxyz()−+'))


def _log_argument(m):
    """'log₃²⁷' -> 'log₃ 27'. The typists set a logarithm's argument as a
    superscript beside its subscript base, so read literally it is a power:
    log₃²⁷ says (log₃)^27. In every case in the sources it is the argument."""
    base, arg = m.group(1), m.group(2)
    arg = arg[2:-1] if arg.startswith('^(') else arg[1:] if arg.startswith('^') else ''.join(_UNSUP[c] for c in arg)
    return f'log{base}' + (arg if arg.startswith('(') else ' ' + arg)


def normalise(text):
    text = text.replace('─', MINUS)
    text = re.sub(r'log\s?([₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₕₖₗₘₙₚₛₜ]+|_\((?:[^()]|\([^()]*\))*\))(\^\((?:[^()]|\([^()]*\))*\)|\^[\w.]+|[⁰¹²³⁴⁵⁶⁷⁸⁹ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁽⁾⁻⁺]+)',
                  _log_argument, text)
    # A degree mark set as a superscript: "6^°" is 6°.
    text = text.replace('^°', '°')
    # "∫ sin8xdx": the differential reads apart from the integrand.
    if '∫' in text:
        text = re.sub(r'(?<=[x)\d²³⁴])d([xyθtu])\b', r' d\1', text)
    # Naira typed as "#": keyboards have no naira key. 89 times across the
    # UTME files, always before a number, and "#" is used for nothing else.
    return re.sub(r'#\s?(?=\d)', '₦', text)
