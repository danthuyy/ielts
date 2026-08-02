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
# DỮ LIỆU: Từ vựng bài "Hello Happiness"
# ============================================================
HELLO_HAPPINESS_VOCAB = [
    {
        "word": "vast",
        "pos": "adjective",
        "ipa": "/vɑːst/",
        "vietnamese": "Khổng lồ, vô cùng lớn",
        "example": "If they won a vast fortune, they would be back to their previous level of happiness.",
        "collocation": "a vast fortune / vast majority / vast amount",
        "topic": "Hello Happiness - Money & Wealth"
    },
    {
        "word": "material wealth",
        "pos": "noun phrase",
        "ipa": "/məˈtɪə.ri.əl welθ/",
        "vietnamese": "Sự giàu có về vật chất",
        "example": "Individuals may increase their material wealth during the course of their lifetime.",
        "collocation": "increase material wealth / accumulate wealth",
        "topic": "Hello Happiness - Money & Wealth"
    },
    {
        "word": "well-being",
        "pos": "noun",
        "ipa": "/ˈwel.biː.ɪŋ/",
        "vietnamese": "Sức khỏe & hạnh phúc (thể chất + tinh thần)",
        "example": "This has no bearing on their well-being.",
        "collocation": "physical / psychological / subjective well-being",
        "topic": "Hello Happiness - Health & Life"
    },
    {
        "word": "adequate",
        "pos": "adjective",
        "ipa": "/ˈæd.ə.kwət/",
        "vietnamese": "Đầy đủ, đáp ứng nhu cầu cơ bản",
        "example": "Once the basic criteria of adequate shelter and nutrition are satisfied.",
        "collocation": "adequate shelter / nutrition / resources",
        "topic": "Hello Happiness - Health & Life"
    },
    {
        "word": "nutrition",
        "pos": "noun",
        "ipa": "/njuːˈtrɪʃ.ən/",
        "vietnamese": "Dinh dưỡng",
        "example": "The basic criteria of adequate shelter and nutrition are satisfied.",
        "collocation": "adequate nutrition / good nutrition / poor nutrition",
        "topic": "Hello Happiness - Health & Life"
    },
    {
        "word": "obsession",
        "pos": "noun",
        "ipa": "/əbˈseʃ.ən/",
        "vietnamese": "Sự ám ảnh, nỗi đam mê quá mức",
        "example": "So why the obsession with getting rich?",
        "collocation": "obsession with sth / have an obsession",
        "topic": "Hello Happiness - Psychology"
    },
    {
        "word": "aspiration",
        "pos": "noun",
        "ipa": "/ˌæs.pɪˈreɪ.ʃən/",
        "vietnamese": "Khát vọng, hoài bão",
        "example": "Causing us much consternation, but fuelling us with new aspirations.",
        "collocation": "career aspirations / personal aspirations",
        "topic": "Hello Happiness - Psychology"
    },
    {
        "word": "consternation",
        "pos": "noun",
        "ipa": "/ˌkɒn.stəˈneɪ.ʃən/",
        "vietnamese": "Sự kinh ngạc lo lắng, sự bàng hoàng",
        "example": "Causing us much consternation, but fuelling us with new aspirations.",
        "collocation": "cause / express consternation",
        "topic": "Hello Happiness - Psychology"
    },
    {
        "word": "sizeable",
        "pos": "adjective",
        "ipa": "/ˈsaɪ.zə.bəl/",
        "vietnamese": "Đáng kể, khá lớn",
        "example": "A sizeable majority would say winning the lottery.",
        "collocation": "a sizeable majority / a sizeable amount",
        "topic": "Hello Happiness - Society"
    },
    {
        "word": "correlate",
        "pos": "verb",
        "ipa": "/ˈkɒr.ə.leɪt/",
        "vietnamese": "Có mối tương quan, liên hệ với nhau",
        "example": "Social interaction correlates strongly with subjective well-being.",
        "collocation": "correlate strongly / highly with sth",
        "topic": "Hello Happiness - Society"
    },
    {
        "word": "autonomy",
        "pos": "noun",
        "ipa": "/ɔːˈtɒn.ə.mi/",
        "vietnamese": "Sự tự chủ, quyền tự quyết",
        "example": "Autonomy over how, where, and at what pace work is done.",
        "collocation": "personal autonomy / professional autonomy",
        "topic": "Hello Happiness - Work & Society"
    },
    {
        "word": "subservient",
        "pos": "adjective",
        "ipa": "/səbˈsɜː.vi.ənt/",
        "vietnamese": "Phục tùng, khúm núm, phụ thuộc",
        "example": "People who are in control of the work they do, rather than subservient to their bosses.",
        "collocation": "subservient to sb / a subservient role",
        "topic": "Hello Happiness - Work & Society"
    },
    {
        "word": "benchmark",
        "pos": "noun",
        "ipa": "/ˈbentʃ.mɑːk/",
        "vietnamese": "Tiêu chuẩn, điểm chuẩn để đo lường",
        "example": "The degree of social connections is the best benchmark of their happiness.",
        "collocation": "set a benchmark / use as a benchmark",
        "topic": "Hello Happiness - Society"
    },
    {
        "word": "depression",
        "pos": "noun",
        "ipa": "/dɪˈpreʃ.ən/",
        "vietnamese": "Trầm cảm, sự suy sụp tinh thần",
        "example": "Loneliness can lead to depression.",
        "collocation": "suffer from depression / lead to depression",
        "topic": "Hello Happiness - Health & Life"
    },
    {
        "word": "resilient",
        "pos": "adjective",
        "ipa": "/rɪˈzɪl.i.ənt/",
        "vietnamese": "Kiên cường, nhanh phục hồi sau khó khăn",
        "example": "Happy people are also more psychologically resilient.",
        "collocation": "emotionally / psychologically resilient",
        "topic": "Hello Happiness - Psychology"
    },
    {
        "word": "assertive",
        "pos": "adjective",
        "ipa": "/əˈsɜː.tɪv/",
        "vietnamese": "Quả quyết, tự tin bày tỏ quan điểm",
        "example": "Happy people are more psychologically resilient, assertive and open to experience.",
        "collocation": "be more assertive / an assertive person",
        "topic": "Hello Happiness - Psychology"
    },
    {
        "word": "enhance",
        "pos": "verb",
        "ipa": "/ɪnˈhɑːns/",
        "vietnamese": "Cải thiện, nâng cao, tăng cường",
        "example": "Having a family enhances well-being.",
        "collocation": "enhance performance / enhance well-being",
        "topic": "Hello Happiness - Useful Verbs"
    },
    {
        "word": "undermine",
        "pos": "verb",
        "ipa": "/ˌʌn.dəˈmaɪn/",
        "vietnamese": "Làm suy yếu, phá hoại ngầm",
        "example": "Worrying simply undermines our ability to enjoy life in the present.",
        "collocation": "undermine confidence / undermine authority",
        "topic": "Hello Happiness - Useful Verbs"
    },
    {
        "word": "sustain",
        "pos": "verb",
        "ipa": "/səˈsteɪn/",
        "vietnamese": "Duy trì, kéo dài, giữ vững",
        "example": "Engage in a loving relationship with another adult, and work hard to sustain it.",
        "collocation": "sustain a relationship / sustain growth",
        "topic": "Hello Happiness - Useful Verbs"
    },
    {
        "word": "dwell on",
        "pos": "phrasal verb",
        "ipa": "/dwel ɒn/",
        "vietnamese": "Suy nghĩ mãi về (điều tiêu cực), cứ day dứt",
        "example": "Just as important is not to dwell on the past.",
        "collocation": "dwell on the past / dwell on mistakes",
        "topic": "Hello Happiness - Useful Verbs"
    },
    {
        "word": "cohabitational",
        "pos": "adjective",
        "ipa": "/ˌkəʊ.hæb.ɪˈteɪ.ʃən.əl/",
        "vietnamese": "Thuộc về việc sống chung (không kết hôn)",
        "example": "Couples in a cohabitational relationship.",
        "collocation": "cohabitational relationship",
        "topic": "Hello Happiness - Society"
    },
    {
        "word": "laid off",
        "pos": "phrasal verb (passive)",
        "ipa": "/leɪd ɒf/",
        "vietnamese": "Bị sa thải (do công ty cắt giảm)",
        "example": "The absence of troubles such as accidents, being laid off or conflicts.",
        "collocation": "get / be laid off",
        "topic": "Hello Happiness - Work & Society"
    },
    {
        "word": "life expectancy",
        "pos": "noun phrase",
        "ipa": "/laɪf ɪkˈspek.tən.si/",
        "vietnamese": "Tuổi thọ trung bình",
        "example": "Their life expectancy has been falling steadily.",
        "collocation": "average life expectancy / increase life expectancy",
        "topic": "Hello Happiness - Health & Life"
    },
    {
        "word": "favourable",
        "pos": "adjective",
        "ipa": "/ˈfeɪ.vər.ə.bəl/",
        "vietnamese": "Thuận lợi, tích cực, có lợi",
        "example": "Happiness is clearly correlated with the presence of favourable events.",
        "collocation": "favourable conditions / favourable outcome",
        "topic": "Hello Happiness - General"
    },
    {
        "word": "stem from",
        "pos": "phrasal verb",
        "ipa": "/stem frɒm/",
        "vietnamese": "Bắt nguồn từ, xuất phát từ",
        "example": "It stems, apparently, from our cave dwelling days.",
        "collocation": "stem from a problem / stem from a need",
        "topic": "Hello Happiness - Useful Verbs"
    },
]


if __name__ == '__main__':
    output = '/Users/danthuy/ielts/IELTS_Hello_Happiness.apkg'
    create_deck(
        HELLO_HAPPINESS_VOCAB,
        'IELTS :: Hello Happiness',
        output
    )
