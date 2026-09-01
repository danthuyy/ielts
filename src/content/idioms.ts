/**
 * A small stock of English idioms shown on the "opening a lesson" screen while
 * pronunciation audio warms up in the background. Each is a bite-sized lesson in
 * itself — meaning, a natural example, and its Vietnamese sense — so the wait
 * teaches something instead of showing a bare spinner.
 *
 * Kept deliberately common and Speaking-friendly: these are the ones an IELTS
 * candidate can actually drop into an answer.
 */
export interface Idiom {
  en: string;
  /** Plain Vietnamese meaning. */
  vi: string;
  example: string;
  exampleVi: string;
}

export const IDIOMS: Idiom[] = [
  {
    en: 'A blessing in disguise',
    vi: 'Trong cái rủi có cái may — điều tưởng xấu hoá ra lại tốt.',
    example: 'Losing that job was a blessing in disguise; I found a better one.',
    exampleVi: 'Mất việc đó hoá ra lại may, tôi tìm được chỗ tốt hơn.',
  },
  {
    en: 'Break the ice',
    vi: 'Phá tan sự ngại ngùng ban đầu, làm quen cho bớt gượng.',
    example: 'He told a joke to break the ice at the meeting.',
    exampleVi: 'Anh ấy kể chuyện vui để phá tan không khí gượng gạo trong buổi họp.',
  },
  {
    en: 'Hit the books',
    vi: 'Vùi đầu vào học hành chăm chỉ.',
    example: 'Exams are next week, so I need to hit the books.',
    exampleVi: 'Tuần sau thi rồi nên tôi phải học cật lực.',
  },
  {
    en: 'Once in a blue moon',
    vi: 'Họa hoằn lắm mới có, rất hiếm khi.',
    example: 'We only eat out once in a blue moon.',
    exampleVi: 'Họa hoằn lắm nhà tôi mới đi ăn ngoài.',
  },
  {
    en: 'The ball is in your court',
    vi: 'Đến lượt bạn quyết định / hành động.',
    example: "I've done my part — now the ball is in your court.",
    exampleVi: 'Tôi làm xong phần mình rồi, giờ tới lượt bạn.',
  },
  {
    en: 'Bite the bullet',
    vi: 'Cắn răng làm việc khó hoặc chấp nhận điều khó chịu.',
    example: 'I hate the dentist, but I bit the bullet and went.',
    exampleVi: 'Tôi sợ nha sĩ, nhưng vẫn cắn răng đi khám.',
  },
  {
    en: 'Cost an arm and a leg',
    vi: 'Đắt cắt cổ, tốn cả gia tài.',
    example: 'A good laptop can cost an arm and a leg.',
    exampleVi: 'Một cái laptop tốt có thể đắt cắt cổ.',
  },
  {
    en: 'A piece of cake',
    vi: 'Dễ như ăn bánh, quá đơn giản.',
    example: 'The test was a piece of cake.',
    exampleVi: 'Bài kiểm tra dễ ợt.',
  },
  {
    en: 'Under the weather',
    vi: 'Thấy trong người không khoẻ, hơi mệt.',
    example: "I'm feeling a bit under the weather today.",
    exampleVi: 'Hôm nay tôi thấy trong người hơi mệt.',
  },
  {
    en: 'Cut corners',
    vi: 'Làm tắt, làm ẩu cho nhanh hoặc cho rẻ.',
    example: "Don't cut corners on safety.",
    exampleVi: 'Đừng làm ẩu chuyện an toàn.',
  },
  {
    en: 'Get out of hand',
    vi: 'Vượt tầm kiểm soát.',
    example: 'The party got out of hand.',
    exampleVi: 'Bữa tiệc trở nên mất kiểm soát.',
  },
  {
    en: 'Hit the nail on the head',
    vi: 'Nói trúng phóc, đúng ngay vấn đề.',
    example: 'You hit the nail on the head with that comment.',
    exampleVi: 'Nhận xét đó của bạn trúng phóc.',
  },
  {
    en: 'Let the cat out of the bag',
    vi: 'Lỡ miệng để lộ bí mật.',
    example: 'She let the cat out of the bag about the surprise party.',
    exampleVi: 'Cô ấy lỡ miệng làm lộ bữa tiệc bất ngờ.',
  },
  {
    en: 'The best of both worlds',
    vi: 'Được cả đôi đường, hưởng lợi cả hai bên.',
    example: 'Working from home is the best of both worlds.',
    exampleVi: 'Làm việc tại nhà là được cả đôi đường.',
  },
  {
    en: 'Speak of the devil',
    vi: 'Vừa nhắc đã tới (nói về ai thì người đó xuất hiện).',
    example: 'Speak of the devil — here she comes!',
    exampleVi: 'Vừa nhắc là tới liền — cô ấy đến kìa!',
  },
  {
    en: 'Pull yourself together',
    vi: 'Bình tĩnh lại, trấn tĩnh mà làm.',
    example: 'Pull yourself together — we can fix this.',
    exampleVi: 'Bình tĩnh lại nào, mình sửa được mà.',
  },
  {
    en: 'Call it a day',
    vi: 'Tạm dừng, nghỉ tay (kết thúc việc hôm nay).',
    example: "We've done enough — let's call it a day.",
    exampleVi: 'Làm đủ rồi, nghỉ tay thôi.',
  },
  {
    en: 'Burn the midnight oil',
    vi: 'Thức khuya học hoặc làm việc.',
    example: 'She burned the midnight oil to finish the essay.',
    exampleVi: 'Cô ấy thức khuya để làm cho xong bài luận.',
  },
  {
    en: 'On the ball',
    vi: 'Nhanh nhạy, nắm bắt tốt, làm việc tỉnh táo.',
    example: 'The new manager is really on the ball.',
    exampleVi: 'Quản lý mới rất nhanh nhạy.',
  },
  {
    en: 'Beat around the bush',
    vi: 'Nói vòng vo, không vào thẳng vấn đề.',
    example: "Stop beating around the bush and tell me.",
    exampleVi: 'Đừng vòng vo nữa, nói thẳng đi.',
  },
  {
    en: 'Better late than never',
    vi: 'Trễ còn hơn không.',
    example: 'He apologised a year later — better late than never.',
    exampleVi: 'Một năm sau anh ấy mới xin lỗi — trễ còn hơn không.',
  },
  {
    en: 'Actions speak louder than words',
    vi: 'Hành động hơn ngàn lời nói.',
    example: "Don't just promise — actions speak louder than words.",
    exampleVi: 'Đừng chỉ hứa — hành động mới đáng giá.',
  },
  {
    en: 'Add fuel to the fire',
    vi: 'Đổ thêm dầu vào lửa, làm tình hình căng hơn.',
    example: 'Shouting only added fuel to the fire.',
    exampleVi: 'La hét chỉ đổ thêm dầu vào lửa.',
  },
  {
    en: 'So far so good',
    vi: 'Đến giờ mọi thứ vẫn ổn.',
    example: 'Halfway through the project and so far so good.',
    exampleVi: 'Dự án đi được nửa chặng, đến giờ vẫn ổn.',
  },
];

/** A random idiom — variety each time a session opens. */
export function pickIdiom(): Idiom {
  return IDIOMS[Math.floor(Math.random() * IDIOMS.length)] ?? IDIOMS[0]!;
}
