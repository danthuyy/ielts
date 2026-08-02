# Anki deck

`create_anki_deck.py` sinh file `.apkg` **trực tiếp từ `content/lessons/*.json`**,
nên bộ thẻ Anki và ứng dụng web luôn dùng chung một nguồn dữ liệu. Trước đây từ
vựng bị chép cứng vào script, tách rời khỏi nội dung của app.

## Cài đặt

```bash
pip install genanki
```

## Sử dụng

Mỗi bài học một file `.apkg`:

```bash
python tools/anki/create_anki_deck.py
```

Chỉ một bài học:

```bash
python tools/anki/create_anki_deck.py --lesson hello_happiness
```

Gộp mọi bài học vào một deck:

```bash
python tools/anki/create_anki_deck.py --combined
```

Đổi thư mục xuất:

```bash
python tools/anki/create_anki_deck.py --out D:\tmp
```

## Ghi chú

- `pos` viết tắt trong JSON (`adj`) được đổi sang dạng đầy đủ trên thẻ (`adjective`).
- Trường `note` được ghép vào mặt Example, ngăn cách bằng `—`, để không mất
  thông tin khi chuyển sang Anki.
- `IELTS_Hello_Happiness.apkg` trong thư mục này là file cũ, sinh ra từ danh sách
  chép cứng trước đây. Nó không còn được cập nhật theo `content/lessons`; chạy
  lại lệnh trên để có bản mới.
- File `.apkg` là sản phẩm dẫn xuất — cân nhắc không commit các file sinh thêm.
