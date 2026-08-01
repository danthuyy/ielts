// Dữ liệu từ vựng - AI sẽ cập nhật file này khi có bài mới
// Mỗi bài đọc là 1 object trong mảng LESSONS
// Quy trình cho AI: thêm object mới vào mảng LESSONS, rồi reload trang

const LESSONS = [
  {
    id: "hello_happiness",
    title: "Hello Happiness",
    date: "2026-08-01",
    words: [
      {
        word: "vast",
        pos: "adj",
        ipa: "/vɑːst/",
        vi: "Khổng lồ, vô cùng lớn",
        example: "If they won a vast fortune, they would be back to their previous level of happiness.",
        collocation: "a vast fortune · vast majority · vast amount"
      },
      {
        word: "material wealth",
        pos: "noun phrase",
        ipa: "/məˈtɪə.ri.əl welθ/",
        vi: "Sự giàu có về vật chất",
        example: "Individuals may increase their material wealth during the course of their lifetime.",
        collocation: "increase material wealth · accumulate wealth"
      },
      {
        word: "well-being",
        pos: "noun",
        ipa: "/ˈwel.biː.ɪŋ/",
        vi: "Sức khỏe & hạnh phúc (thể chất + tinh thần)",
        example: "This has no bearing on their well-being.",
        collocation: "physical well-being · psychological well-being"
      },
      {
        word: "adequate",
        pos: "adj",
        ipa: "/ˈæd.ə.kwət/",
        vi: "Đầy đủ, đáp ứng nhu cầu cơ bản",
        example: "Once the basic criteria of adequate shelter and nutrition are satisfied.",
        collocation: "adequate shelter · adequate nutrition · adequate resources"
      },
      {
        word: "nutrition",
        pos: "noun",
        ipa: "/njuːˈtrɪʃ.ən/",
        vi: "Dinh dưỡng",
        example: "The basic criteria of adequate shelter and nutrition are satisfied.",
        collocation: "adequate nutrition · good nutrition · poor nutrition"
      },
      {
        word: "obsession",
        pos: "noun",
        ipa: "/əbˈseʃ.ən/",
        vi: "Sự ám ảnh, đam mê quá mức",
        example: "So why the obsession with getting rich?",
        collocation: "obsession with sth · have an obsession"
      },
      {
        word: "aspiration",
        pos: "noun",
        ipa: "/ˌæs.pɪˈreɪ.ʃən/",
        vi: "Khát vọng, hoài bão",
        example: "Causing us much consternation, but fuelling us with new aspirations.",
        collocation: "career aspirations · personal aspirations"
      },
      {
        word: "consternation",
        pos: "noun",
        ipa: "/ˌkɒn.stəˈneɪ.ʃən/",
        vi: "Sự kinh ngạc lo lắng, bàng hoàng",
        example: "Causing us much consternation, but fuelling us with new aspirations.",
        collocation: "cause consternation · express consternation"
      },
      {
        word: "sizeable",
        pos: "adj",
        ipa: "/ˈsaɪ.zə.bəl/",
        vi: "Đáng kể, khá lớn",
        example: "A sizeable majority would say winning the lottery.",
        collocation: "a sizeable majority · a sizeable amount"
      },
      {
        word: "correlate",
        pos: "verb",
        ipa: "/ˈkɒr.ə.leɪt/",
        vi: "Có mối tương quan, liên hệ với nhau",
        example: "Social interaction correlates strongly with subjective well-being.",
        collocation: "correlate strongly with · correlate highly with"
      },
      {
        word: "autonomy",
        pos: "noun",
        ipa: "/ɔːˈtɒn.ə.mi/",
        vi: "Sự tự chủ, quyền tự quyết",
        example: "Autonomy over how, where, and at what pace work is done.",
        collocation: "personal autonomy · professional autonomy"
      },
      {
        word: "subservient",
        pos: "adj",
        ipa: "/səbˈsɜː.vi.ənt/",
        vi: "Phục tùng, khúm núm, phụ thuộc",
        example: "People who are in control rather than subservient to their bosses.",
        collocation: "subservient to sb · a subservient role"
      },
      {
        word: "benchmark",
        pos: "noun",
        ipa: "/ˈbentʃ.mɑːk/",
        vi: "Tiêu chuẩn, điểm chuẩn đo lường",
        example: "Social connections is the best benchmark of their happiness.",
        collocation: "set a benchmark · use as a benchmark"
      },
      {
        word: "depression",
        pos: "noun",
        ipa: "/dɪˈpreʃ.ən/",
        vi: "Trầm cảm, suy sụp tinh thần",
        example: "Loneliness can lead to depression.",
        collocation: "suffer from depression · lead to depression"
      },
      {
        word: "resilient",
        pos: "adj",
        ipa: "/rɪˈzɪl.i.ənt/",
        vi: "Kiên cường, nhanh phục hồi",
        example: "Happy people are also more psychologically resilient.",
        collocation: "emotionally resilient · psychologically resilient"
      },
      {
        word: "assertive",
        pos: "adj",
        ipa: "/əˈsɜː.tɪv/",
        vi: "Quả quyết, tự tin bày tỏ quan điểm",
        example: "Happy people are resilient, assertive and open to experience.",
        collocation: "be more assertive · an assertive person"
      },
      {
        word: "enhance",
        pos: "verb",
        ipa: "/ɪnˈhɑːns/",
        vi: "Cải thiện, nâng cao, tăng cường",
        example: "Having a family enhances well-being.",
        collocation: "enhance performance · enhance well-being"
      },
      {
        word: "undermine",
        pos: "verb",
        ipa: "/ˌʌn.dəˈmaɪn/",
        vi: "Làm suy yếu, phá hoại ngầm",
        example: "Worrying simply undermines our ability to enjoy life.",
        collocation: "undermine confidence · undermine authority"
      },
      {
        word: "sustain",
        pos: "verb",
        ipa: "/səˈsteɪn/",
        vi: "Duy trì, kéo dài, giữ vững",
        example: "Engage in a loving relationship and work hard to sustain it.",
        collocation: "sustain a relationship · sustain growth"
      },
      {
        word: "dwell on",
        pos: "phrasal verb",
        ipa: "/dwel ɒn/",
        vi: "Suy nghĩ mãi về điều tiêu cực, day dứt",
        example: "Just as important is not to dwell on the past.",
        collocation: "dwell on the past · dwell on mistakes"
      },
      {
        word: "laid off",
        pos: "phrasal verb",
        ipa: "/leɪd ɒf/",
        vi: "Bị sa thải (do cắt giảm)",
        example: "The absence of troubles such as accidents, being laid off or conflicts.",
        collocation: "get laid off · be laid off"
      },
      {
        word: "life expectancy",
        pos: "noun phrase",
        ipa: "/laɪf ɪkˈspek.tən.si/",
        vi: "Tuổi thọ trung bình",
        example: "Their life expectancy has been falling steadily.",
        collocation: "average life expectancy · increase life expectancy"
      },
      {
        word: "favourable",
        pos: "adj",
        ipa: "/ˈfeɪ.vər.ə.bəl/",
        vi: "Thuận lợi, tích cực, có lợi",
        example: "Happiness is clearly correlated with the presence of favourable events.",
        collocation: "favourable conditions · favourable outcome"
      },
      {
        word: "stem from",
        pos: "phrasal verb",
        ipa: "/stem frɒm/",
        vi: "Bắt nguồn từ, xuất phát từ",
        example: "It stems, apparently, from our cave dwelling days.",
        collocation: "stem from a problem · stem from a need"
      },
      {
        word: "cohabitational",
        pos: "adj",
        ipa: "/ˌkəʊ.hæb.ɪˈteɪ.ʃən.əl/",
        vi: "Thuộc về việc sống chung (không kết hôn)",
        example: "Couples in a cohabitational relationship.",
        collocation: "cohabitational relationship"
      }
    ]
  }
];
