# 📚 Hướng Dẫn Học IELTS Vocabulary với Anki

> Tài liệu này dành cho **AI assistant** và **người dùng**. Bất kỳ AI model nào cũng có thể
> đọc file này và thực hiện đúng quy trình tạo flashcard cho người dùng.

---

## 🎯 Thông tin người dùng

- **Trình độ hiện tại**: IELTS 4.5 – 5.5
- **Mục tiêu**: Nâng band lên 6.0+
- **Thiết bị**: Mac + iPhone (AnkiMobile)
- **Thư mục làm việc**: `/Users/danthuy/ielts/`
- **Script tạo deck**: `/Users/danthuy/ielts/create_anki_deck.py`

---

## ⚙️ QUY TRÌNH CHO AI (khi người dùng đưa bài mới)

### Bước 1: Người dùng đưa bài đọc tiếng Anh

### Bước 2: AI soạn từ vựng

- Chọn **15–25 từ/cụm từ** phù hợp trình độ B2–C1 (band 6.0–7.0)
- **KHÔNG** chọn từ quá dễ (a, the, happy, sad...) hoặc quá khó (C2)
- Ưu tiên: từ học thuật (Academic Word List), collocations, phrasal verbs
- Mỗi từ cần có đủ:
  - `word`: từ tiếng Anh
  - `pos`: loại từ (noun, verb, adjective, adverb, phrasal verb, noun phrase...)
  - `ipa`: phiên âm IPA (tra chuẩn, đừng đoán)
  - `vietnamese`: nghĩa tiếng Việt (dễ hiểu, sát ngữ cảnh bài đọc)
  - `example`: câu ví dụ trích từ bài đọc gốc
  - `collocation`: 2–3 cụm từ hay đi kèm
  - `topic`: tên bài đọc + nhóm chủ đề

### Bước 3: AI chỉnh sửa file script

Mở file `/Users/danthuy/ielts/create_anki_deck.py` và:

1. Thay đổi biến `HELLO_HAPPINESS_VOCAB` thành danh sách từ mới (hoặc tạo biến mới)
2. Thay đổi `deck_name` và `output` file ở phần `__main__`
3. Giữ nguyên `IELTS_MODEL` (model ID `1607392319`) và `deck ID` (`2059400110`) để Anki gộp tất cả vào cùng 1 bộ thẻ

**QUAN TRỌNG**: Giữ nguyên deck ID `2059400110` để tất cả từ vựng gộp vào 1 deck duy nhất trên Anki.
Nếu muốn tạo deck riêng biệt, dùng ID khác (tạo bằng `random.randrange(1 << 30, 1 << 31)`).

### Bước 4: Chạy script + mở Anki

```bash
python3 /Users/danthuy/ielts/create_anki_deck.py
open /Users/danthuy/ielts/<tên_file>.apkg
```

Anki sẽ tự mở và hiện hộp thoại Import → người dùng nhấn Import → nhấn Sync.

### Bước 5: Lưu file từ vựng .md

Ngoài file .apkg, cũng lưu 1 bản từ vựng dạng markdown trong `/Users/danthuy/ielts/` để người dùng có thể đọc lại khi cần.

---

## 📱 HƯỚNG DẪN HỌC TRÊN iPHONE (cho người dùng)

### Cài đặt ban đầu (1 lần duy nhất)

1. Mua app **AnkiMobile Flashcards** trên App Store ($24.99)
2. Tạo tài khoản tại https://ankiweb.net/account/register
3. Trên Mac: mở Anki → nhấn **Sync** (🔄) → đăng nhập tài khoản AnkiWeb
4. Trên iPhone: mở AnkiMobile → đăng nhập cùng tài khoản → nhấn Sync

### Cách học hàng ngày

#### 🌅 Buổi sáng (10–15 phút)

1. Mở **AnkiMobile** trên iPhone
2. Nhấn **Sync** (kéo xuống để refresh) → lấy thẻ mới nếu có
3. Nhấn vào deck **"IELTS"** để bắt đầu học
4. Với mỗi thẻ:

```
┌─────────────────────────────────────┐
│         IELTS VOCABULARY            │
│                                     │
│            vast                     │  ← Từ tiếng Anh
│          adjective                  │  ← Loại từ
│                                     │
│     🔊 Nhấn để nghe phát âm        │  ← Anki sẽ đọc từ này
│                                     │
│  [        Show Answer         ]     │  ← Nhấn để xem đáp án
└─────────────────────────────────────┘
```

5. **ĐỌC TO TỪ ĐÓ** (rất quan trọng để luyện phát âm!)
6. Cố **ĐOÁN NGHĨA** trước khi lật thẻ
7. Nhấn **"Show Answer"** để xem mặt sau:

```
┌─────────────────────────────────────┐
│            vast                     │
│          adjective                  │
│  ──────────────────────────────     │
│         /vɑːst/                     │  ← Phiên âm IPA
│  Khổng lồ, vô cùng lớn             │  ← Nghĩa tiếng Việt
│                                     │
│  📎 a vast fortune / vast majority  │  ← Cụm từ hay dùng
│                                     │
│  📖 If they won a vast fortune,     │  ← Câu ví dụ
│  they would be back to their        │
│  previous level of happiness.       │
│                                     │
│  🔊 (Anki đọc cả câu ví dụ)       │
│                                     │
│  [Again] [Hard] [Good] [Easy]       │  ← Chọn mức độ nhớ
└─────────────────────────────────────┘
```

8. **NGHE KỸ phát âm** → **ĐỌC THEO** 2-3 lần
9. Đọc câu ví dụ thành tiếng
10. Chọn mức độ nhớ:

| Nút                   | Khi nào nhấn                       | Anki sẽ hỏi lại sau          |
| --------------------- | ---------------------------------- | ---------------------------- |
| **Again** (Đỏ)        | Hoàn toàn không nhớ, sai hoàn toàn | ~1 phút (hỏi lại ngay)       |
| **Hard** (Cam)        | Nhớ mang máng, phải nghĩ lâu       | ~6 phút                      |
| **Good** (Xanh lá)    | Nhớ được, mất vài giây suy nghĩ    | ~10 phút (lần đầu), tăng dần |
| **Easy** (Xanh dương) | Nhớ ngay lập tức, quá dễ           | 4 ngày (nhảy xa)             |

> 💡 **MẸO**: Hầu hết thời gian nên nhấn **Good**. Chỉ nhấn **Easy** khi thực sự quá dễ.
> Nhấn **Again** không có gì xấu hổ — đó là cách Anki giúp bạn nhớ lâu!

#### 🌙 Buổi tối (5–10 phút) — ÔN LẠI

- Mở Anki lần nữa → học các thẻ "Due" (đến hạn ôn)
- Anki tự động nhắc bạn ôn đúng lúc sắp quên (Spaced Repetition)

### Spaced Repetition là gì? (Tại sao Anki hiệu quả)

```
Ngày 1: Học từ "vast" → nhấn Good
Ngày 2: Anki hỏi lại "vast" → nhớ → nhấn Good
Ngày 4: Anki hỏi lại → nhớ → Good
Ngày 8: Anki hỏi lại → nhớ → Good
Ngày 20: Anki hỏi lại → nhớ → Good
Ngày 45: Anki hỏi lại → nhớ → Good
...
→ Từ "vast" đã vào bộ nhớ dài hạn! 🎉
```

Nếu bạn quên ở bất kỳ bước nào → nhấn **Again** → Anki quay lại hỏi sớm hơn.
Đây là phương pháp **khoa học nhất** để ghi nhớ từ vựng lâu dài.

---

## 📅 LỊCH HỌC GỢI Ý

| Thời gian       | Việc làm                              | Thời lượng |
| --------------- | ------------------------------------- | ---------- |
| Sáng sớm        | Mở Anki → học thẻ mới + ôn thẻ cũ     | 10–15 phút |
| Trưa (giờ nghỉ) | Ôn lại thẻ "Due" nếu có               | 5 phút     |
| Tối             | Ôn lại tất cả thẻ đến hạn             | 5–10 phút  |
| Cuối tuần       | Đưa bài đọc mới cho AI → nhận thẻ mới | 5 phút     |

---

## 🎯 CÀI ĐẶT ANKI TỐI ƯU CHO IELTS

Trên Anki máy tính, vào deck → **Options** (⚙️) → chỉnh:

| Cài đặt             | Giá trị gợi ý | Lý do                               |
| ------------------- | ------------- | ----------------------------------- |
| New cards/day       | **10**        | Không quá nhiều, đủ để nhớ          |
| Maximum reviews/day | **50**        | Đảm bảo ôn hết thẻ cũ               |
| Learning steps      | **1m 10m**    | Hỏi lại sau 1 phút, rồi 10 phút     |
| Graduating interval | **1**         | Sau khi học xong → hỏi lại ngày mai |

> 💡 Nếu thấy quá nhiều thẻ ôn, giảm "New cards/day" xuống **5**.
> Nếu thấy quá ít, tăng lên **15–20**.

---

## 🗂️ CẤU TRÚC THƯ MỤC

```
/Users/danthuy/ielts/
├── create_anki_deck.py          ← Script tạo flashcard (AI dùng)
├── HUONG_DAN_HOC.md             ← File này (hướng dẫn toàn bộ)
├── happiness_vocabulary.md      ← Từ vựng dạng đọc (bài Hello Happiness)
├── IELTS_Hello_Happiness.apkg   ← File flashcard Anki (bài Hello Happiness)
└── (các file .apkg và .md khác sẽ được thêm khi có bài mới)
```

---

## ❓ CÂU HỎI THƯỜNG GẶP

**Q: Tôi quên sync thì sao?**
A: Không sao. Lần sau mở Anki trên Mac hoặc iPhone → nhấn Sync là được. Dữ liệu không mất.

**Q: Tôi bấm nhầm "Easy" hoặc "Again" thì sao?**
A: Không sao cả. Anki sẽ tự điều chỉnh lại lịch ôn. Cứ học tiếp bình thường.

**Q: Mỗi ngày nên học bao nhiêu từ mới?**
A: Với trình độ 4.5–5.5, nên học **10 từ mới/ngày** + ôn thẻ cũ. Đừng tham nhiều!

**Q: Tôi có thể học offline không?**
A: Có! Sau khi Sync xong, bạn có thể tắt wifi và học bình thường. Lần sau có wifi thì Sync lại.

**Q: Làm sao để AI tạo thẻ mới cho tôi?**
A: Chỉ cần gửi bài đọc tiếng Anh và nói: "Tạo flashcard Anki từ bài này". AI sẽ đọc file này và làm theo quy trình.
