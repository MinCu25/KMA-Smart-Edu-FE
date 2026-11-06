/** Adapted from KMA_trang_chu_final.zip. DOM behavior is isolated to the public portal. */
export function initializeHome(root, assetBase) {
  const asset = (file) => assetBase + file;
  const controller = new AbortController();
  const cleanups = [];
  let disposed = false;
  function listen(target, type, listener, options = {}) {
    target.addEventListener(type, listener, {
      ...options,
      signal: controller.signal,
    });
  }
  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "log-in": '<path d="M14 3h6v18h-6M3 12h12m-5-5 5 5-5 5"/>',
    "arrow-right": '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    "chevron-right": '<path d="m9 5 7 7-7 7"/>',
    "chevron-left": '<path d="m15 5-7 7 7 7"/>',
    search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    "file-text":
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 12h8m-8 4h6"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
  };
  const icon = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths[name] || ""}</svg>`;
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
  const $ = (id) => root.querySelector(`[id="${id}"]`);
  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  const normalize = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const sampleNote =
    '<p class="sample-note">Nội dung minh họa để duyệt giao diện. Thông báo, kế hoạch và quy trình tại đây chưa phải nội dung chính thức của Học viện.</p>';
  const noticeNote =
    '<p class="sample-note">Tiêu đề và ngày đăng lấy từ cổng đào tạo hiện tại. Phần nội dung chi tiết trong hộp này chưa kết nối dữ liệu thật.</p>';
  const dialog = $("detail-dialog");
  function showDialog(category, title, html) {
    $("dialog-category").textContent = category;
    $("dialog-title").textContent = title;
    $("dialog-content").innerHTML = html;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  listen($("dialog-close"), "click", () => dialog.close());
  listen(dialog, "click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      dialog.close();
  });
  function focusLogin() {
    if (dialog.open) dialog.close();
    $("account").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    $("account").focus({ preventScroll: true });
  }
  root
    .querySelectorAll("[data-login]")
    .forEach((button) => listen(button, "click", focusLogin));
  const menu = $("menu-toggle");
  listen(menu, "click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    $("nav-links").classList.toggle("open", open);
  });
  $("nav-links")
    .querySelectorAll("a")
    .forEach((link) =>
      listen(link, "click", () => {
        menu.setAttribute("aria-expanded", "false");
        $("nav-links").classList.remove("open");
      }),
    );
  listen($("dialog-content"), "click", (event) => {
    if (event.target.closest("[data-modal-login]")) focusLogin();
  });
  // Keyboard navigation for tabs, including roving tabindex.
  function bindTabs(container, attribute, onSelect) {
    const buttons = [...container.querySelectorAll('[role="tab"]')];
    function select(button) {
      buttons.forEach((item) => {
        const selected = item === button;
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      onSelect(button.getAttribute(attribute), button);
    }
    buttons.forEach((button, index) => {
      listen(button, "click", () => select(button));
      listen(button, "keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft")
          next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else return;
        event.preventDefault();
        select(buttons[next]);
        buttons[next].focus();
      });
    });
  }
  const notices = [
    {
      id: 1,
      date: "05/11/2026",
      category: "Học vụ",
      semester: "2",
      title:
        "Thông báo v/v thực hiện xét học bổng khuyến khích học tập cho sinh viên đại học chính quy hệ dân sự học kỳ 2 năm học 2025–2026",
      important: true,
      fresh: true,
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 2,
      date: "05/11/2026",
      category: "Học vụ",
      semester: "1",
      title:
        "Quy định về học bổng cho sinh viên đại học chính quy hệ đào tạo phục vụ lĩnh vực kinh tế – xã hội tại Học viện Kỹ thuật Mật mã",
      fresh: true,
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 3,
      date: "26/10/2026",
      category: "Học vụ",
      semester: "1",
      title: "Hướng dẫn sinh viên về thủ tục hành chính",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 4,
      date: "08/10/2026",
      category: "Học vụ",
      semester: "1",
      title: "Thông báo về việc hỗ trợ cấp lại mật khẩu",
      important: true,
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 5,
      date: "06/10/2026",
      category: "Lịch thi",
      semester: "1",
      title:
        "Kế hoạch tổ chức thi KTHP Học kỳ 1 năm học 2026–2027. Đợt 1 (Hệ KTXH)",
      views: 1313,
      unit: "Phòng KT&ĐBCLĐT",
      body: "Phòng KT&ĐBCLĐT thông báo về Kế hoạch tổ chức thi KTHP Học kỳ 1 năm học 2026–2027 các hệ đào tạo phục vụ kinh tế xã hội (đợt 1).",
    },
    {
      id: 6,
      date: "21/09/2026",
      category: "Lịch thi",
      semester: "2",
      title:
        "Thông báo về kỳ thi kết thúc học phần Học kỳ 2 năm học 2025–2026 các hệ đào tạo phục vụ kinh tế xã hội (lần 2)",
      views: 667,
      unit: "Phòng KT&ĐBCLĐT",
      body: "Căn cứ vào Kế hoạch số 877/KH-HVM ngày 19/9/2026 của Học viện Kỹ thuật Mật mã về việc tổ chức thi kết thúc học phần Học kỳ 2 năm học 2025–2026 (lần 2), Học viện thông báo nộp lệ phí thi lần 2.",
    },
    {
      id: 7,
      date: "15/09/2026",
      category: "Học vụ",
      semester: "1",
      title: "Thông báo thời gian sinh viên đăng ký các học phần còn nợ",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 8,
      date: "14/09/2026",
      category: "Lịch thi",
      semester: "1",
      title: "Thông báo về kỳ thi sát hạch Tiếng Anh đầu ra 2026 – Đợt 3",
      views: 676,
      unit: "Phòng KT&ĐBCLĐT",
      body: "Căn cứ vào Kế hoạch số 641/KH-HVM ngày 10/7/2026 của Học viện về việc tổ chức thi sát hạch chuẩn đầu ra ngoại ngữ Đợt 3 năm 2026, Học viện thông báo hình thức đăng ký thi và nộp lệ phí.",
    },
    {
      id: 9,
      date: "11/09/2026",
      category: "Học vụ",
      semester: "1",
      title: "Quyết định",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 10,
      date: "07/09/2026",
      category: "Tốt nghiệp",
      semester: "1",
      title:
        "Thông báo kế hoạch phúc khảo, đính chính điểm thi tốt nghiệp năm 2026. Lần 2",
      views: 353,
      unit: "Phòng KT&ĐBCLĐT",
      body: "Nhằm đảm bảo quyền lợi của sinh viên và tính khách quan trong công tác chấm thi, Phòng Khảo thí và Đảm bảo chất lượng đào tạo thông báo về việc tiếp nhận đơn phúc khảo, đính chính điểm thi tốt nghiệp.",
    },
    {
      id: 11,
      date: "07/09/2026",
      category: "Lịch thi",
      semester: "2",
      title:
        "Thông báo kế hoạch phúc khảo, đính chính điểm thi KTHP Học kỳ Hè năm học 2025–2026",
      views: 211,
      unit: "Phòng KT&ĐBCLĐT",
      body: "Nhằm đảm bảo quyền lợi của sinh viên và tính khách quan trong công tác chấm thi, Phòng Khảo thí và Đảm bảo chất lượng đào tạo thông báo về việc tiếp nhận đơn phúc khảo, đính chính điểm thi kết thúc học phần.",
    },
    {
      id: 12,
      date: "19/08/2026",
      category: "Học phí",
      semester: "1",
      title:
        "Thông báo thu hồ sơ miễn, giảm học phí học kỳ 1 năm học 2026–2027",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 13,
      date: "10/08/2026",
      category: "Học phí",
      semester: "1",
      title: "Thông báo thời hạn nộp học phí học kỳ 1 năm học 2026–2027",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 14,
      date: "04/08/2026",
      category: "Học vụ",
      semester: "1",
      title:
        "Thông báo v/v hoãn mở lớp học phần thuộc các ngành An toàn thông tin, Công nghệ thông tin và Kỹ thuật điện tử viễn thông, Học kỳ 1 năm học 2026–2027",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 15,
      date: "22/06/2026",
      category: "Học vụ",
      semester: "2",
      title:
        "Danh sách phòng học các học phần tổ chức kỳ phụ hè năm học 2025–2026",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 16,
      date: "20/06/2026",
      category: "Học vụ",
      semester: "1",
      title:
        "Kế hoạch nghỉ hè, kỳ học phụ (kỳ hè) năm học 2025–2026 và Lịch học học kỳ 1 năm học 2026–2027",
      important: true,
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 17,
      date: "28/04/2026",
      category: "Học phí",
      semester: "2",
      title: "Quyết định miễn, giảm học phí học kỳ 2 năm học 2025–2026",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 18,
      date: "06/04/2026",
      category: "Học vụ",
      semester: "1",
      title: "Kế hoạch đào tạo năm học 2026–2027",
      important: true,
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 19,
      date: "06/04/2026",
      category: "Học vụ",
      semester: "2",
      title:
        "Thông báo tổ chức các lớp học lại, học cải thiện điểm theo lớp riêng – học kỳ 2, năm học 2025–2026 cho sinh viên các lớp đại học chính quy (hệ đào tạo Phục vụ phát triển kinh tế xã hội)",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 20,
      date: "10/02/2025",
      category: "Học vụ",
      semester: "",
      title: "Danh mục học phần thay thế (cơ sở đào tạo Hồ Chí Minh)",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
    {
      id: 21,
      date: "24/01/2025",
      category: "Học vụ",
      semester: "",
      title: "Danh mục học phần thay thế (cơ sở đào tạo Hà Nội)",
      body: "Xem nội dung đầy đủ và tệp đính kèm của thông báo trên cổng đào tạo.",
    },
  ];
  let category = "all",
    page = 1;
  const pageSize = 6;
  bindTabs(
    root.querySelector(".notice-tabs"),
    "data-category",
    (value, button) => {
      category = value;
      page = 1;
      $("notice-results").setAttribute("aria-labelledby", button.id);
      renderNotices();
    },
  );
  function filteredNotices() {
    const query = normalize($("notice-search").value.trim());
    return notices.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        ($("semester").value === "all" ||
          item.semester === $("semester").value) &&
        (!query || normalize(`${item.title} ${item.category}`).includes(query)),
    );
  }
  function renderNotices() {
    const rows = filteredNotices(),
      totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * pageSize;
    $("notice-list").innerHTML =
      rows
        .slice(start, start + pageSize)
        .map(
          (item) =>
            `<li class="notice-item"><div class="notice-item-main"><button class="notice-title" data-notice="${item.id}">${item.important ? '<span class="important-tag">Quan trọng</span>' : ""}${escapeHTML(item.title)}${item.fresh ? '<span class="new-tag">Mới</span>' : ""}</button><div class="notice-meta"><span class="category-label">${item.category}</span><span class="meta-sep">|</span><span>${escapeHTML(item.unit || "Phòng Đào tạo")}</span>${item.views ? `<span class="meta-sep">|</span><span>${item.views} lượt xem</span>` : ""}</div></div><time class="notice-date" datetime="${item.date.split("/").reverse().join("-")}">${item.date}</time></li>`,
        )
        .join("") ||
      '<li class="empty-state">Không tìm thấy thông báo phù hợp.<button type="button" id="reset-filters">Xóa bộ lọc</button></li>';
    $("result-count").textContent = rows.length
      ? `Hiển thị ${start + 1}–${Math.min(start + pageSize, rows.length)} / ${rows.length} thông báo`
      : "0 thông báo";
    $("pagination").innerHTML =
      `<button type="button" data-page="${page - 1}" aria-label="Trang trước" ${page === 1 ? "disabled" : ""}>${icon("chevron-left")}</button>` +
      Array.from(
        { length: totalPages },
        (_, i) =>
          `<button type="button" data-page="${i + 1}" aria-label="Trang ${i + 1}" ${page === i + 1 ? 'aria-current="page"' : ""}>${i + 1}</button>`,
      ).join("") +
      `<button type="button" data-page="${page + 1}" aria-label="Trang sau" ${page === totalPages ? "disabled" : ""}>${icon("chevron-right")}</button>`;
  }
  listen($("notice-search"), "input", () => {
    page = 1;
    renderNotices();
  });
  listen($("semester"), "change", () => {
    page = 1;
    renderNotices();
  });
  listen($("pagination"), "click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    page = Number(button.dataset.page);
    renderNotices();
  });
  listen($("notice-list"), "click", (event) => {
    if (event.target.closest("#reset-filters")) {
      $("notice-search").value = "";
      $("semester").value = "all";
      $("category-all").click();
      return;
    }
    const button = event.target.closest("[data-notice]");
    if (!button) return;
    const item = notices.find(
      (row) => row.id === Number(button.dataset.notice),
    );
    showDialog(
      "THÔNG BÁO ĐÀO TẠO · " + item.category.toUpperCase(),
      item.title,
      `<p class="article-date">${escapeHTML(item.unit || "Phòng Đào tạo")} · Ngày đăng: ${item.date}${item.views ? ` · ${item.views} lượt xem` : ""}</p><p>${escapeHTML(item.body)}</p>${noticeNote}`,
    );
  });
  listen(document, "keydown", (event) => {
    if (
      event.key === "/" &&
      !dialog.open &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
    ) {
      event.preventDefault();
      $("notice-search").focus();
    }
    if (event.key === "Escape" && $("nav-links").classList.contains("open")) {
      $("nav-links").classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
      menu.focus();
    }
  });
  renderNotices();
  const planRows = [
    [
      "09–13/11/2026",
      "Rà soát kết quả học tập",
      "Đối chiếu điểm và các học phần đã hoàn thành.",
    ],
    [
      "16–22/11/2026",
      "Đăng ký học phần học kỳ II",
      "Kiểm tra điều kiện học phần, lựa chọn lớp và hoàn tất đăng ký.",
    ],
    [
      "23–27/11/2026",
      "Điều chỉnh đăng ký học phần",
      "Rà soát lịch học, điều chỉnh lựa chọn và xác nhận kết quả.",
    ],
  ];
  root.querySelectorAll("[data-plan]").forEach((button) =>
    listen(button, "click", () => {
      const row = planRows[Number(button.dataset.plan)];
      showDialog(
        "KẾ HOẠCH HỌC VỤ",
        row[1],
        `<p class="article-date">Thời gian minh họa: ${row[0]}</p><p>${row[2]}</p>${sampleNote}`,
      );
    }),
  );
  listen($("full-plan"), "click", () =>
    showDialog(
      "KẾ HOẠCH HỌC VỤ",
      "Kế hoạch học kỳ · Năm học 2026–2027",
      `<table><thead><tr><th>Thời gian</th><th>Nội dung</th></tr></thead><tbody>${planRows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`).join("")}</tbody></table>${sampleNote}`,
    ),
  );
  const documents = {
    regulations: {
      title: "Quy chế đào tạo đại học",
      html: "<p>Mục tài liệu đề xuất giúp sinh viên tra cứu các nội dung liên quan đến học vụ.</p><ul><li>Đăng ký và điều chỉnh học phần.</li><li>Đánh giá kết quả học tập và tích lũy tín chỉ.</li><li>Điều kiện xét tốt nghiệp và các thủ tục học vụ.</li></ul><p>Văn bản chính thức cần được cập nhật bởi đơn vị quản lý trước khi hệ thống đi vào sử dụng.</p>",
    },
    certificate: {
      title: "Đề nghị xác nhận sinh viên",
      html: '<p>Quy trình đề xuất cho yêu cầu xác nhận sinh viên trực tuyến:</p><ol><li>Đăng nhập vào cổng thông tin đào tạo.</li><li>Chọn Dịch vụ sinh viên → Đề nghị xác nhận sinh viên.</li><li>Chọn mục đích sử dụng, kiểm tra thông tin và gửi yêu cầu.</li><li>Theo dõi trạng thái và hướng dẫn nhận kết quả.</li></ol><button class="primary" data-modal-login>Đến phần đăng nhập</button>',
    },
    transcript: {
      title: "Đề nghị cấp bảng điểm",
      html: '<p>Quy trình đề xuất cho yêu cầu cấp bảng điểm:</p><ol><li>Đăng nhập và kiểm tra kết quả học tập.</li><li>Chọn Dịch vụ sinh viên → Đề nghị cấp bảng điểm.</li><li>Điền mục đích, phạm vi học kỳ và thông tin nhận kết quả.</li><li>Gửi yêu cầu và theo dõi quá trình xử lý.</li></ol><button class="primary" data-modal-login>Đến phần đăng nhập</button>',
    },
  };
  root.querySelectorAll("[data-document]").forEach((button) =>
    listen(button, "click", () => {
      const doc = documents[button.dataset.document];
      showDialog("VĂN BẢN & BIỂU MẪU", doc.title, doc.html + sampleNote);
    }),
  );
  function showHelp(type) {
    if (type === "password")
      showDialog(
        "HỖ TRỢ TÀI KHOẢN",
        "Hướng dẫn lấy lại mật khẩu",
        "<p>Chuẩn bị mã sinh viên hoặc mã cán bộ và email được cấp. Khi có hệ thống tài khoản chính thức, yêu cầu đặt lại mật khẩu sẽ được xác thực qua kênh do Học viện quy định.</p><p>Bản giao diện hiện chưa cung cấp chức năng đặt lại mật khẩu. Không có dữ liệu tài khoản nào được gửi hoặc lưu lại.</p>",
      );
    else
      showDialog(
        "HỖ TRỢ HỌC VỤ",
        "Liên hệ bộ phận đào tạo",
        "<p>Khi cần hỗ trợ, chuẩn bị mã sinh viên, học kỳ và nội dung cụ thể cần được giải đáp. Các vấn đề thường gặp gồm đăng ký học phần, lịch học, kết quả học tập và thủ tục sinh viên.</p><p>Thông tin liên hệ chính thức cần được đơn vị quản lý bổ sung trước khi đưa hệ thống vào sử dụng.</p>",
      );
  }
  root
    .querySelectorAll("[data-help]")
    .forEach((button) =>
      listen(button, "click", () => showHelp(button.dataset.help)),
    );
  listen($("academy-detail"), "click", () =>
    showDialog(
      "THÔNG TIN HỌC VIỆN",
      "Học viện Kỹ thuật Mật mã",
      '<p>Cổng thông tin đào tạo tập trung các thông báo học vụ, kế hoạch học tập và hướng dẫn thực hiện thủ tục cho người học.</p><img src="' +
        asset("kma-campus.png") +
        '" alt="Không gian giới thiệu Học viện Kỹ thuật Mật mã">',
    ),
  );

  // Ô tra cứu ở đầu trang: lọc danh sách thông báo rồi cuộn xuống.
  listen($("head-search"), "submit", (event) => {
    event.preventDefault();
    $("category-all").click();
    $("notice-search").value = $("head-q").value;
    $("notice-search").dispatchEvent(new Event("input"));
    $("notifications").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });

  // Banner: hòa ảnh 950ms, nhịp xem 5800ms, ảnh chụp phóng rất nhẹ; banner chữ không phóng.
  // Tải/giải mã ảnh trước khi chuyển; dừng khi hover, focus bàn phím, mở hộp thoại hoặc ẩn tab.
  // Muốn đổi ảnh hoặc chú thích thì sửa mảng slides bên dưới.
  const slides = [
    {
      src: asset("slides/khai-giang.webp"),
      cat: "Hoạt động Học viện",
      title: "Lễ khai giảng năm học 2026–2027",
      alt: "Banner Lễ khai giảng năm học 2026–2027, ngày 15/10/2026, tại Hội trường Học viện Kỹ thuật Mật mã",
      text: "Lễ khai giảng năm học 2026–2027 diễn ra ngày 15/10/2026 tại Hội trường Học viện Kỹ thuật Mật mã.",
    },
    {
      src: asset("slides/chung-ket-vi-mach.webp"),
      cat: "Cuộc thi",
      title: "Chung kết Cuộc thi thiết kế vi mạch bảo mật và an toàn thông tin",
      alt: "Banner Chung kết Cuộc thi thiết kế vi mạch bảo mật và an toàn thông tin, Hà Nội, tháng 11/2026",
      text: "Chung kết Cuộc thi thiết kế vi mạch bảo mật và an toàn thông tin do Học viện Kỹ thuật Mật mã tổ chức cùng các đơn vị phối hợp, diễn ra tại Hà Nội vào tháng 11/2026.",
    },
    {
      src: asset("slides/vcris-2026.webp"),
      pos: "50% 60%",
      cat: "Hội thảo khoa học",
      title: "Hội thảo quốc tế VCRIS 2026",
      alt: "Các đại biểu chụp ảnh lưu niệm trước màn hình Hội thảo quốc tế lần thứ 3 về Mật mã và An toàn thông tin VCRIS 2026",
      text: "Hội thảo quốc tế lần thứ 3 về Mật mã và An toàn thông tin (VCRIS 2026), diễn ra tại Hà Nội ngày 29–30/10/2026.",
    },
    {
      src: asset("slides/trao-giai-an-ninh-mang.webp"),
      cat: "Cuộc thi",
      title: "Lễ trao giải Cuộc thi Sinh viên An ninh mạng 2026",
      alt: "Lễ trao cúp và vinh danh các đội đoạt giải Nhì Bảng A tại Cuộc thi Sinh viên An ninh mạng 2026",
      text: "Lễ trao cúp và vinh danh các đội đoạt giải Nhì Bảng A tại Cuộc thi Sinh viên An ninh mạng 2026.",
    },
    {
      src: asset("slides/be-giang-1.webp"),
      pos: "50% 45%",
      cat: "Hoạt động Học viện",
      title: "Lễ bế giảng và trao bằng tốt nghiệp năm 2026",
      alt: "Phát biểu tại Lễ bế giảng và trao bằng tốt nghiệp năm 2026 của Học viện Kỹ thuật Mật mã",
      text: "Lễ bế giảng và trao bằng tốt nghiệp năm 2026 diễn ra ngày 29/9/2026 tại Hà Nội.",
    },
    {
      src: asset("slides/be-giang-2.webp"),
      pos: "50% 38%",
      cat: "Hoạt động Học viện",
      title: "Toàn cảnh Lễ bế giảng và trao bằng tốt nghiệp năm 2026",
      alt: "Toàn cảnh hội trường trong Lễ bế giảng và trao bằng tốt nghiệp năm 2026",
      text: "Toàn cảnh Lễ bế giảng và trao bằng tốt nghiệp năm 2026, ngày 29/9/2026 tại Hà Nội.",
    },
  ];
  (function initHeroCarousel() {
    const DURATION = 5800,
      FADE_TIME = 950;
    const box = $("hero-carousel"),
      frame = $("slides"),
      caption = $("slide-text");
    const progress = $("slide-progress-fill"),
      toggle = $("slide-toggle"),
      dots = $("slide-dots");
    const stage = box.querySelector(".stage");
    const motion = matchMedia("(prefers-reduced-motion: reduce)"),
      n = slides.length;
    if (!box || !frame || !n) return;
    iconPaths.pause = '<path d="M8 5v14M16 5v14"/>';
    iconPaths.play = '<path d="m7 4 13 8-13 8z"/>';
    frame.innerHTML = slides
      .map(
        (s, i) =>
          `<figure class="slide ${i > 1 ? "is-photo" : "is-banner"}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${n}" aria-hidden="${i !== 0}"><img src="${s.src}" alt="${escapeHTML(s.alt)}" style="object-position:${s.pos || "50% 50%"}" decoding="async" loading="eager" fetchpriority="${i ? "low" : "high"}" draggable="false"></figure>`,
      )
      .join("");
    dots.innerHTML = slides
      .map(
        (s, i) =>
          `<button type="button" class="slide-dot" data-slide="${i}" aria-label="Ảnh ${i + 1}: ${escapeHTML(s.title)}" aria-controls="slides" aria-pressed="${i === 0}"></button>`,
      )
      .join("");
    const figs = [...frame.children],
      dotButtons = [...dots.children];
    const ready = new Map();
    let cur = 0,
      requested = 0,
      requestId = 0,
      frameId = 0,
      lastTime = null,
      elapsed = 0;
    // Every fresh page load starts autoplay. Reduced-motion only disables visual motion.
    let changing = false,
      userPaused = false,
      hover = matchMedia("(hover: hover)").matches && stage.matches(":hover"),
      focus = false,
      inView = true,
      drag = null;
    let settleTimer = 0,
      captionTimer = 0,
      measureFrame = 0;
    const playbackAllowed = () =>
      !disposed &&
      !userPaused &&
      !hover &&
      !focus &&
      !drag &&
      !document.hidden &&
      inView &&
      !dialog.open;

    function ensureReady(index) {
      if (!ready.has(index)) {
        const image = figs[index].querySelector("img");
        ready.set(
          index,
          (async () => {
            if (!image.complete)
              await new Promise((resolve, reject) => {
                listen(image, "load", resolve, { once: true });
                listen(image, "error", reject, { once: true });
              });
            if (!image.naturalWidth)
              throw new Error("Banner image unavailable");
            if (image.decode) await image.decode();
          })().catch((error) => {
            ready.delete(index);
            throw error;
          }),
        );
      }
      return ready.get(index);
    }
    function renderProgress() {
      progress.style.transform = `scaleX(${Math.min(1, elapsed / DURATION)})`;
    }
    function renderToggle() {
      toggle.innerHTML = icon(userPaused ? "play" : "pause");
      toggle.setAttribute(
        "aria-label",
        userPaused ? "Tự động chuyển ảnh" : "Tạm dừng tự động chuyển ảnh",
      );
      toggle.setAttribute("aria-pressed", String(!userPaused));
    }
    function syncPlayback() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      lastTime = null;
      const playing = playbackAllowed();
      box.classList.toggle("is-paused", !playing);
      caption.setAttribute("aria-live", playing ? "off" : "polite");
      if (playing && !changing) frameId = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (!playbackAllowed() || changing) {
        syncPlayback();
        return;
      }
      if (lastTime !== null) elapsed += Math.min(now - lastTime, 100);
      lastTime = now;
      renderProgress();
      if (elapsed >= DURATION) {
        show(cur + 1, 1);
        return;
      }
      frameId = requestAnimationFrame(tick);
    }
    function updateCaption(index) {
      $("slide-cat").textContent = slides[index].cat;
      $("slide-title").textContent = slides[index].title;
      $("slide-count").textContent =
        String(index + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0");
    }
    function animateCaption(index) {
      clearTimeout(captionTimer);
      caption.getAnimations().forEach((animation) => animation.cancel());
      if (motion.matches || !caption.animate) {
        updateCaption(index);
        return;
      }
      caption.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-5px)" },
        ],
        { duration: 160, easing: "ease", fill: "forwards" },
      );
      captionTimer = setTimeout(() => {
        updateCaption(index);
        caption.getAnimations().forEach((animation) => animation.cancel());
        caption.animate(
          [
            { opacity: 0, transform: "translateY(7px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 460, easing: "cubic-bezier(.2,.65,.3,1)", fill: "both" },
        );
      }, 150);
    }
    async function show(index, direction = 1) {
      const target = (index + n) % n;
      requested = target;
      const token = ++requestId;
      if (target === cur && !changing) {
        elapsed = 0;
        renderProgress();
        syncPlayback();
        return;
      }
      changing = true;
      syncPlayback();
      try {
        await ensureReady(target);
      } catch {
        if (token !== requestId) return;
        requested = cur;
        changing = false;
        elapsed = 0;
        renderProgress();
        syncPlayback();
        return;
      }
      if (token !== requestId) return;
      clearTimeout(settleTimer);
      const outgoing = cur;
      figs.forEach((fig, i) => {
        if (i !== outgoing && i !== target)
          fig.classList.remove("is-active", "is-leaving");
        fig.setAttribute("aria-hidden", String(i !== target));
      });
      if (outgoing !== target) {
        figs[outgoing].classList.remove("is-active");
        figs[outgoing].classList.add("is-leaving");
      }
      figs[target].style.setProperty(
        "--slide-enter",
        (direction > 0 ? 12 : -12) + "px",
      );
      figs[target].classList.remove("is-leaving");
      figs[target].classList.add("is-active");
      cur = target;
      box.classList.add("is-transitioning");
      dotButtons.forEach((button, i) => {
        button.classList.toggle("is-current", i === cur);
        button.setAttribute("aria-pressed", String(i === cur));
      });
      animateCaption(cur);
      elapsed = 0;
      renderProgress();
      const finish = () => {
        figs.forEach((fig, i) => {
          if (i !== cur) fig.classList.remove("is-active", "is-leaving");
        });
        box.classList.remove("is-transitioning");
        changing = false;
        syncPlayback();
        ensureReady((cur + 1) % n).catch(() => {});
      };
      if (motion.matches) finish();
      else settleTimer = setTimeout(finish, FADE_TIME + 40);
    }
    function queueMeasure() {
      if (disposed) return;
      cancelAnimationFrame(measureFrame);
      measureFrame = requestAnimationFrame(reserveCaptionHeight);
    }
    function reserveCaptionHeight() {
      if (!caption.clientWidth) return;
      const measure = caption.cloneNode(true);
      measure.removeAttribute("id");
      measure.removeAttribute("aria-live");
      measure.classList.add("slide-measure");
      measure.setAttribute("aria-hidden", "true");
      measure.inert = true;
      measure.style.width = caption.clientWidth + "px";
      measure
        .querySelectorAll("[id]")
        .forEach((el) => el.removeAttribute("id"));
      measure.querySelectorAll("button").forEach((button) => {
        button.tabIndex = -1;
      });
      root.append(measure);
      let max = 0;
      for (const s of slides) {
        measure.querySelector(".slide-cat").textContent = s.cat;
        measure.querySelector(".slide-title>span:first-child").textContent =
          s.title;
        max = Math.max(max, measure.offsetHeight);
      }
      measure.remove();
      if (caption.style.minHeight !== max + "px")
        caption.style.minHeight = max + "px";
    }
    listen($("slide-prev"), "click", () => show(requested - 1, -1));
    listen($("slide-next"), "click", () => show(requested + 1, 1));
    listen(toggle, "click", () => {
      userPaused = !userPaused;
      renderToggle();
      syncPlayback();
    });
    listen(dots, "click", (event) => {
      const button = event.target.closest("[data-slide]");
      if (!button) return;
      const target = Number(button.dataset.slide);
      show(target, target < cur ? -1 : 1);
    });
    listen($("event-detail"), "click", () => {
      const s = slides[cur];
      showDialog(
        s.cat.toUpperCase(),
        s.title,
        `<p>${escapeHTML(s.text)}</p><img src="${s.src}" alt="${escapeHTML(s.alt)}">`,
      );
      syncPlayback();
    });
    listen(stage, "pointerenter", (event) => {
      if (event.pointerType === "mouse") {
        hover = true;
        syncPlayback();
      }
    });
    listen(stage, "pointerleave", (event) => {
      if (event.pointerType === "mouse") {
        hover = false;
        syncPlayback();
      }
    });
    listen(box, "focusin", (event) => {
      focus = event.target.matches(":focus-visible");
      syncPlayback();
    });
    listen(box, "focusout", () =>
      queueMicrotask(() => {
        focus =
          box.contains(document.activeElement) &&
          document.activeElement.matches(":focus-visible");
        syncPlayback();
      }),
    );
    listen(box, "keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(requested - 1, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        show(requested + 1, 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        show(0, -1);
      } else if (event.key === "End") {
        event.preventDefault();
        show(n - 1, 1);
      }
    });
    listen(document, "visibilitychange", syncPlayback);
    listen(dialog, "close", syncPlayback);
    listen(frame, "pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      frame.setPointerCapture(event.pointerId);
      syncPlayback();
    });
    listen(frame, "pointerup", (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      drag = null;
      if (frame.hasPointerCapture(event.pointerId))
        frame.releasePointerCapture(event.pointerId);
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25)
        show(requested + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else syncPlayback();
    });
    listen(frame, "pointercancel", () => {
      drag = null;
      syncPlayback();
    });
    listen(frame, "lostpointercapture", () => {
      if (drag) {
        drag = null;
        syncPlayback();
      }
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting;
          syncPlayback();
        },
        { threshold: 0.1 },
      );
      observer.observe(box);
      cleanups.push(() => observer.disconnect());
    }
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(queueMeasure);
      observer.observe(caption);
      cleanups.push(() => observer.disconnect());
    } else listen(window, "resize", queueMeasure, { passive: true });
    document.fonts?.ready.then(queueMeasure);
    listen(motion, "change", syncPlayback);
    figs[0].classList.add("is-active");
    dotButtons[0].classList.add("is-current");
    updateCaption(0);
    renderToggle();
    queueMeasure();
    changing = true;
    syncPlayback();
    ensureReady(0)
      .catch(() => {})
      .finally(() => {
        if (requestId === 0) {
          changing = false;
          syncPlayback();
        }
      });
    slides.forEach((_, i) => ensureReady(i).catch(() => {}));
    cleanups.push(() => {
      requestId++;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(measureFrame);
      clearTimeout(settleTimer);
      clearTimeout(captionTimer);
      caption.getAnimations().forEach((animation) => animation.cancel());
    });
  })();

  return () => {
    disposed = true;
    controller.abort();
    cleanups.forEach((cleanup) => cleanup());
    if (dialog.open) dialog.close();
  };
}
