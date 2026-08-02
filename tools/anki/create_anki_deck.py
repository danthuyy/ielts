#!/usr/bin/env python3
"""
Script tạo bộ flashcard Anki (.apkg) cho học từ vựng IELTS.
- Mặt trước: Từ tiếng Anh + phát âm tự động (TTS)
- Mặt sau: Phiên âm IPA, loại từ, nghĩa tiếng Việt, ví dụ trong bài
"""

import genanki
import json
import sys
import os

# ============================================================
# MODEL: Thiết kế giao diện flashcard
# ============================================================
IELTS_MODEL = genanki.Model(
    1607392319,
    'IELTS Vocabulary Card',
    fields=[
        {'name': 'Word'},          # Từ tiếng Anh
        {'name': 'PartOfSpeech'},  # Loại từ (noun, verb, adj...)
        {'name': 'IPA'},           # Phiên âm IPA
        {'name': 'Vietnamese'},    # Nghĩa tiếng Việt
        {'name': 'Example'},       # Câu ví dụ từ bài đọc
        {'name': 'Collocation'},   # Cụm từ hay đi kèm
        {'name': 'Topic'},         # Chủ đề bài đọc
    ],
    templates=[
        {
            'name': 'EN → VI',
            'qfmt': '''
<div class="card front">
    <div class="topic">{{Topic}}</div>
    <div class="word">{{Word}}</div>
    <div class="pos">{{PartOfSpeech}}</div>
    <div class="hint">🔊 Nhấn để nghe phát âm</div>
    {{tts en_US voices=Apple_Samantha speed=0.9:Word}}
</div>
            ''',
            'afmt': '''
<div class="card back">
    <div class="topic">{{Topic}}</div>
    <div class="word">{{Word}}</div>
    <div class="pos">{{PartOfSpeech}}</div>
    <hr>
    <div class="ipa">{{IPA}}</div>
    <div class="meaning">{{Vietnamese}}</div>
    {{#Collocation}}
    <div class="collocation">📎 <b>Collocation:</b> {{Collocation}}</div>
    {{/Collocation}}
    <div class="example">📖 {{Example}}</div>
    {{tts en_US voices=Apple_Samantha speed=0.8:Example}}
</div>
            ''',
        },
        {
            'name': 'VI → EN',
            'qfmt': '''
<div class="card front">
    <div class="topic">{{Topic}}</div>
    <div class="meaning reverse-meaning">{{Vietnamese}}</div>
    <div class="pos">{{PartOfSpeech}}</div>
    {{#Collocation}}
    <div class="collocation">📎 {{Collocation}}</div>
    {{/Collocation}}
    <div class="hint">⌨️ Gõ từ tiếng Anh vào ô bên dưới:</div>
    {{type:Word}}
</div>
            ''',
            'afmt': '''
<div class="card back">
    <div class="topic">{{Topic}}</div>
    <div class="word">{{Word}}</div>
    <div class="ipa">{{IPA}}</div>
    <div class="pos">{{PartOfSpeech}}</div>
    <hr>
    {{type:Word}}
    <div class="meaning">{{Vietnamese}}</div>
    <div class="example">📖 {{Example}}</div>
    {{tts en_US voices=Apple_Samantha speed=0.8:Word}}
</div>
            ''',
        },
    ],
    css='''
.card {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 480px;
    margin: 0 auto;
    padding: 24px;
    text-align: center;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #e0e0e0;
    border-radius: 16px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.topic {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #8b5cf6;
    margin-bottom: 16px;
    font-weight: 600;
}

.word {
    font-size: 36px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 8px;
    text-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.pos {
    font-size: 13px;
    color: #a78bfa;
    font-style: italic;
    margin-bottom: 12px;
}

.ipa {
    font-size: 20px;
    color: #c4b5fd;
    margin-bottom: 16px;
    font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
}

.meaning {
    font-size: 22px;
    color: #34d399;
    font-weight: 600;
    margin-bottom: 16px;
    line-height: 1.4;
}

.reverse-meaning {
    font-size: 28px;
    color: #fbbf24;
    margin-bottom: 12px;
}

.collocation {
    font-size: 14px;
    color: #93c5fd;
    background: rgba(59, 130, 246, 0.15);
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    text-align: left;
}

.example {
    font-size: 14px;
    color: #d1d5db;
    font-style: italic;
    line-height: 1.5;
    background: rgba(255,255,255,0.05);
    padding: 12px;
    border-radius: 8px;
    border-left: 3px solid #8b5cf6;
    text-align: left;
    margin-top: 8px;
}

.hint {
    font-size: 12px;
    color: #6b7280;
    margin-top: 16px;
}

hr {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
    margin: 16px 0;
}

/* Type answer input box */
input[type="text"] {
    font-size: 24px;
    font-weight: 600;
    padding: 12px 16px;
    border: 2px solid #8b5cf6;
    border-radius: 12px;
    background: rgba(139, 92, 246, 0.1);
    color: #ffffff;
    text-align: center;
    width: 80%;
    margin: 16px auto;
    outline: none;
    font-family: inherit;
}

input[type="text"]:focus {
    border-color: #a78bfa;
    background: rgba(139, 92, 246, 0.2);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
}

/* Correct/incorrect feedback styling */
.typeGood {
    color: #34d399;
    font-size: 22px;
    font-weight: 700;
}

.typeBad {
    color: #f87171;
    font-size: 22px;
    font-weight: 700;
    text-decoration: line-through;
}

.typeMissed {
    color: #fbbf24;
    font-size: 22px;
    font-weight: 700;
}
'''
)


def create_deck(vocab_list, deck_name, output_file):
    """
    Tạo file .apkg từ danh sách từ vựng.

    vocab_list: list of dict, mỗi dict có các key:
        word, pos, ipa, vietnamese, example, collocation (optional), topic
    deck_name: tên bộ thẻ
    output_file: đường dẫn file .apkg xuất ra
    """
    deck = genanki.Deck(
        2059400110,
        deck_name
    )

    for vocab in vocab_list:
        note = genanki.Note(
            model=IELTS_MODEL,
            fields=[
                vocab['word'],
                vocab.get('pos', ''),
                vocab.get('ipa', ''),
                vocab['vietnamese'],
                vocab.get('example', ''),
                vocab.get('collocation', ''),
                vocab.get('topic', 'IELTS Vocabulary'),
            ]
        )
        deck.add_note(note)

    genanki.Package(deck).write_to_file(output_file)
    print(f"✅ Đã tạo {len(vocab_list)} thẻ → {output_file}")
    return output_file


# ============================================================
# NGUỒN DỮ LIỆU: content/lessons/*.json
# ============================================================
#
# Từ vựng trước đây được chép cứng vào file này, tách rời khỏi nội dung mà ứng
# dụng web dùng — sửa một bên là hai bên lệch nhau. Giờ deck được sinh thẳng từ
# content/lessons, nên chỉ còn một nguồn sự thật duy nhất.

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LESSONS_DIR = ROOT / 'content' / 'lessons'

# Schema của app dùng dạng viết tắt; Anki hiển thị dạng đầy đủ dễ đọc hơn.
POS_LABEL = {
    'n': 'noun',
    'v': 'verb',
    'adj': 'adjective',
    'adv': 'adverb',
    'phrasal v': 'phrasal verb',
    'phr': 'phrase',
    'idiom': 'idiom',
}


def expand_pos(pos):
    """'adj' -> 'adjective', 'v/n' -> 'verb / noun'."""
    return ' / '.join(POS_LABEL.get(part.strip(), part.strip()) for part in pos.split('/'))


def load_lessons(lesson_ids=None):
    """Đọc content/lessons/*.json, trả về list (lesson_id, title, vocab_list)."""
    if not LESSONS_DIR.is_dir():
        raise SystemExit(f'Không tìm thấy {LESSONS_DIR}')

    out = []
    for path in sorted(LESSONS_DIR.glob('*.json')):
        lesson = json.loads(path.read_text(encoding='utf8'))
        if lesson_ids and lesson['id'] not in lesson_ids:
            continue
        vocab = [
            {
                'word': w['word'],
                'pos': expand_pos(w.get('pos', '')),
                'ipa': w.get('ipa', ''),
                'vietnamese': w.get('vi', ''),
                # Ghi chú đi kèm ví dụ để không mất thông tin khi sang Anki.
                'example': ' — '.join(x for x in (w.get('example', ''), w.get('note', '')) if x),
                'collocation': w.get('collocation', ''),
                'topic': lesson['title'],
            }
            for w in lesson['words']
        ]
        out.append((lesson['id'], lesson['title'], vocab))

    if not out:
        raise SystemExit('Không có bài học nào khớp.')
    return out


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(
        description='Sinh file Anki .apkg từ content/lessons/*.json'
    )
    parser.add_argument(
        '--lesson', action='append', metavar='ID',
        help='Chỉ lấy bài học có id này (lặp lại được). Mặc định: tất cả.'
    )
    parser.add_argument(
        '--out', default=str(ROOT / 'tools' / 'anki'), metavar='DIR',
        help='Thư mục xuất file .apkg (mặc định: tools/anki)'
    )
    parser.add_argument(
        '--combined', action='store_true',
        help='Gộp mọi bài học vào một deck thay vì mỗi bài một file.'
    )
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    lessons = load_lessons(set(args.lesson) if args.lesson else None)

    if args.combined:
        vocab = [w for _, _, words in lessons for w in words]
        create_deck(vocab, 'IELTS :: Vocabulary', str(out_dir / 'IELTS_Vocabulary.apkg'))
    else:
        for lesson_id, title, vocab in lessons:
            create_deck(vocab, f'IELTS :: {title}', str(out_dir / f'{lesson_id}.apkg'))
