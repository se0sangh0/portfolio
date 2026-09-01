(() => {
  "use strict";

  const bookIntro = document.getElementById("book-intro");
  const portfolioShell = document.getElementById("portfolio-shell");
  const openNotebookButton = document.getElementById("open-notebook");
  const closeNotebookButton = document.getElementById("close-notebook");
  const pageStage = document.querySelector(".page-stage");
  const pages = Array.from(document.querySelectorAll(".notebook-page"));
  const postitLinks = Array.from(document.querySelectorAll(".postit-nav [data-page-link]"));
  const allPageLinks = Array.from(document.querySelectorAll("[data-page-link]"));
  const previousButton = document.getElementById("previous-page");
  const nextButton = document.getElementById("next-page");
  const edgePreviousButton = document.getElementById("edge-previous-page");
  const edgeNextButton = document.getElementById("edge-next-page");
  const previousTitle = document.getElementById("previous-title");
  const nextTitle = document.getElementById("next-title");
  const pageCounter = document.getElementById("page-counter");
  const currentPageTitle = document.getElementById("current-page-title");
  const announcer = document.getElementById("page-announcer");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pageIds = pages.map((page) => page.id);
  const pageTitles = pages.map((page) => page.dataset.pageTitle || page.id);
  const baseTitle = "서상호 | 게임·시스템 기획 포트폴리오";
  const openDuration = 620;
  const closeDuration = 420;
  let currentIndex = 0;
  let isBookOpen = false;
  let pageAnimationTimer = 0;
  let bookAnimationTimer = 0;
  let bookTransitioning = false;
  let printState = null;
  let syncingLocation = false;

  if (
    !bookIntro ||
    !portfolioShell ||
    !openNotebookButton ||
    !closeNotebookButton ||
    !pageStage ||
    pages.length === 0
  ) {
    return;
  }

  function decodedHash() {
    const rawHash = window.location.hash.slice(1);
    if (!rawHash) return null;
    try {
      return decodeURIComponent(rawHash);
    } catch {
      return null;
    }
  }

  function validPageId(id) {
    return pageIds.includes(id) ? id : null;
  }

  function titleFor(index) {
    return pageTitles[index] || "";
  }

  function cleanUrl() {
    return window.location.pathname + window.location.search;
  }

  function bookTransitionDuration(open) {
    if (reducedMotion.matches) return 0;
    if (window.matchMedia("(max-width: 767px)").matches) return open ? 320 : 260;
    return open ? openDuration : closeDuration;
  }

  function updateNavigation(index) {
    const pageId = pageIds[index];

    postitLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === "#" + pageId;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    pageCounter.textContent =
      String(index).padStart(2, "0") +
      " / " +
      String(pages.length - 1).padStart(2, "0");
    currentPageTitle.textContent = titleFor(index);
    document.title = isBookOpen ? titleFor(index) + " | 서상호 포트폴리오" : baseTitle;

    previousButton.disabled = index === 0;
    nextButton.disabled = index === pages.length - 1;
    if (edgePreviousButton && edgeNextButton) {
      edgePreviousButton.disabled = index === 0;
      edgeNextButton.disabled = index === pages.length - 1;
    }
    previousTitle.textContent = index > 0 ? titleFor(index - 1) : "첫 기록";
    nextTitle.textContent = index < pages.length - 1 ? titleFor(index + 1) : "마지막 기록";
    if (edgePreviousButton && edgeNextButton) {
      edgePreviousButton.setAttribute(
        "aria-label",
        index > 0 ? "이전 기록: " + titleFor(index - 1) : "이전 기록 없음"
      );
      edgeNextButton.setAttribute(
        "aria-label",
        index < pages.length - 1
          ? "다음 기록: " + titleFor(index + 1)
          : "다음 기록 없음"
      );
      edgePreviousButton.title =
        index > 0 ? "이전 기록: " + titleFor(index - 1) : "이전 기록 없음";
      edgeNextButton.title =
        index < pages.length - 1
          ? "다음 기록: " + titleFor(index + 1)
          : "다음 기록 없음";
    }
  }

  function setBookBusy(busy) {
    bookTransitioning = busy;
    openNotebookButton.disabled = busy;
    closeNotebookButton.disabled = busy;
    if (busy) portfolioShell.setAttribute("aria-busy", "true");
    else portfolioShell.removeAttribute("aria-busy");
  }

  function playPageTurn(direction) {
    window.clearTimeout(pageAnimationTimer);
    pageStage.classList.remove("is-turning-next", "is-turning-previous");
    if (reducedMotion.matches) return;

    void pageStage.offsetWidth;
    pageStage.classList.add(
      direction === "previous" ? "is-turning-previous" : "is-turning-next"
    );
    pageAnimationTimer = window.setTimeout(() => {
      pageStage.classList.remove("is-turning-next", "is-turning-previous");
    }, 430);
  }

  function scrollToPageStart() {
    const top = portfolioShell.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion.matches ? "auto" : "smooth"
    });
  }

  function finishOpening(focusHeading) {
    bookIntro.hidden = true;
    bookIntro.inert = true;
    bookIntro.setAttribute("aria-hidden", "true");
    portfolioShell.classList.remove("is-opening", "is-closing");
    portfolioShell.classList.add("is-open");
    portfolioShell.inert = false;
    document.body.classList.remove("book-opening", "book-closing");
    document.body.classList.add("book-open");
    setBookBusy(false);

    if (focusHeading) {
      const heading = pages[currentIndex].querySelector("h1[tabindex='-1']");
      heading?.focus({ preventScroll: true });
    }
    scrollToPageStart();
    announcer.textContent =
      "포트폴리오 노트를 열었습니다. " +
      titleFor(currentIndex) +
      ", " +
      (currentIndex + 1) +
      " / " +
      pages.length;
  }

  function finishClosing(returnFocus) {
    portfolioShell.hidden = true;
    portfolioShell.inert = true;
    portfolioShell.setAttribute("aria-hidden", "true");
    portfolioShell.classList.remove("is-opening", "is-closing", "is-open");
    bookIntro.classList.remove("is-opening", "is-returning");
    document.body.classList.remove("book-open", "book-opening", "book-closing");
    document.body.classList.add("book-closed");
    document.title = baseTitle;
    setBookBusy(false);

    if (returnFocus) openNotebookButton.focus();
    announcer.textContent = "포트폴리오 노트를 닫았습니다.";
  }

  function setBookOpen(open, options = {}) {
    const {
      animate = true,
      focusHeading = false,
      returnFocus = false
    } = options;
    const transitionDuration = animate ? bookTransitionDuration(open) : 0;
    const shouldAnimate = transitionDuration > 0;

    window.clearTimeout(bookAnimationTimer);
    bookIntro.classList.remove("is-opening", "is-returning");
    portfolioShell.classList.remove("is-opening", "is-closing");
    document.body.classList.remove("book-opening", "book-closing");

    isBookOpen = open;
    openNotebookButton.setAttribute("aria-expanded", String(open));

    if (open) {
      portfolioShell.hidden = false;
      portfolioShell.inert = shouldAnimate;
      portfolioShell.removeAttribute("aria-hidden");
      bookIntro.inert = false;
      document.body.classList.remove("book-closed");
      document.body.classList.add("book-open");
      updateNavigation(currentIndex);

      if (!shouldAnimate) {
        finishOpening(focusHeading);
        return;
      }

      setBookBusy(true);
      bookIntro.classList.add("is-opening");
      portfolioShell.classList.add("is-opening");
      document.body.classList.add("book-opening");
      bookAnimationTimer = window.setTimeout(
        () => finishOpening(focusHeading),
        transitionDuration
      );
      return;
    }

    portfolioShell.inert = true;
    bookIntro.hidden = false;
    bookIntro.inert = false;
    bookIntro.removeAttribute("aria-hidden");
    document.body.classList.remove("book-open");
    updateNavigation(currentIndex);

    if (!shouldAnimate) {
      finishClosing(returnFocus);
      return;
    }

    setBookBusy(true);
    portfolioShell.classList.add("is-closing");
    bookIntro.classList.add("is-returning");
    document.body.classList.add("book-closing");
    bookAnimationTimer = window.setTimeout(
      () => finishClosing(returnFocus),
      transitionDuration
    );
  }

  function activatePage(id, options = {}) {
    const {
      focusHeading = true,
      animate = true,
      scroll = true,
      announce = true
    } = options;
    const nextId = validPageId(id) || "profile";
    const nextIndex = pageIds.indexOf(nextId);
    const previousIndex = currentIndex;
    const isSame =
      nextIndex === currentIndex &&
      pages[currentIndex] &&
      !pages[currentIndex].hidden;

    if (!isSame) {
      pages.forEach((page, index) => {
        const active = index === nextIndex;
        page.hidden = !active;
        page.classList.toggle("is-active", active);
      });
      currentIndex = nextIndex;
    }

    updateNavigation(nextIndex);

    if (animate && isBookOpen && !isSame) {
      playPageTurn(nextIndex < previousIndex ? "previous" : "next");
    }

    if (focusHeading && isBookOpen) {
      const activeHeading = pages[nextIndex].querySelector("h1[tabindex='-1']");
      window.requestAnimationFrame(() => activeHeading?.focus({ preventScroll: true }));
    }
    if (scroll && isBookOpen) {
      window.requestAnimationFrame(scrollToPageStart);
    }
    if (announce && isBookOpen && !isSame) {
      announcer.textContent =
        titleFor(nextIndex) + ", " + (nextIndex + 1) + " / " + pages.length;
    }
  }

  function navigateTo(index, options = {}) {
    if (index < 0 || index >= pages.length) return;
    if (bookTransitioning) return;
    const id = pageIds[index];
    const openingFromCover = !isBookOpen;

    if (isBookOpen && index === currentIndex) {
      activatePage(id, {
        focusHeading: true,
        animate: false,
        scroll: true,
        announce: false
      });
      return;
    }

    if (options.replace) {
      history.replaceState({ view: "book", page: id }, "", "#" + id);
    } else {
      history.pushState({ view: "book", page: id }, "", "#" + id);
    }

    activatePage(id, {
      focusHeading: false,
      animate: !openingFromCover,
      scroll: !openingFromCover,
      announce: !openingFromCover
    });

    if (openingFromCover) {
      setBookOpen(true, {
        animate: true,
        focusHeading: true
      });
    } else {
      activatePage(id, {
        focusHeading: true,
        animate: false,
        scroll: true,
        announce: false
      });
    }
  }

  function closeNotebook(options = {}) {
    const { pushHistory = true, returnFocus = true } = options;
    if (!isBookOpen || bookTransitioning) return;

    if (pushHistory) {
      history.pushState(
        { view: "cover", page: pageIds[currentIndex] },
        "",
        cleanUrl()
      );
    }
    setBookOpen(false, {
      animate: true,
      returnFocus
    });
  }

  function syncFromLocation(options = {}) {
    if (syncingLocation) return;
    syncingLocation = true;

    const hashValue = decodedHash();
    const pageId = validPageId(hashValue);

    if (hashValue && !pageId) {
      history.replaceState({ view: "book", page: "profile" }, "", "#profile");
      activatePage("profile", {
        focusHeading: false,
        animate: false,
        scroll: false,
        announce: false
      });
      setBookOpen(true, {
        animate: options.animate ?? true,
        focusHeading: options.focus ?? true
      });
      syncingLocation = false;
      return;
    }

    if (pageId) {
      const wasOpen = isBookOpen;
      activatePage(pageId, {
        focusHeading: wasOpen && (options.focus ?? true),
        animate: wasOpen && (options.animate ?? true),
        scroll: wasOpen,
        announce: wasOpen
      });
      if (!wasOpen) {
        setBookOpen(true, {
          animate: options.animate ?? true,
          focusHeading: options.focus ?? true
        });
      }
    } else {
      setBookOpen(false, {
        animate: options.animate ?? true,
        returnFocus: options.focus ?? true
      });
    }

    syncingLocation = false;
  }

  allPageLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const id = validPageId(href.slice(1));
      if (!id) return;

      event.preventDefault();
      navigateTo(pageIds.indexOf(id));
    });
  });

  openNotebookButton.addEventListener("click", () => navigateTo(currentIndex));
  closeNotebookButton.addEventListener("click", () => closeNotebook());
  previousButton.addEventListener("click", () => navigateTo(currentIndex - 1));
  nextButton.addEventListener("click", () => navigateTo(currentIndex + 1));
  edgePreviousButton?.addEventListener("click", () => navigateTo(currentIndex - 1));
  edgeNextButton?.addEventListener("click", () => navigateTo(currentIndex + 1));

  window.addEventListener("popstate", () => {
    syncFromLocation({ animate: true, focus: true });
  });

  window.addEventListener("hashchange", () => {
    const hashPage = validPageId(decodedHash());
    if (
      (hashPage && isBookOpen && pageIds[currentIndex] === hashPage) ||
      (!hashPage && !isBookOpen)
    ) {
      return;
    }
    syncFromLocation({ animate: true, focus: true });
  });

  document.addEventListener("keydown", (event) => {
    if (!isBookOpen) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (window.getSelection()?.toString()) return;

    const active = document.activeElement;
    if (
      active &&
      (active.matches("a, button, input, textarea, select, summary, [contenteditable='true']") ||
        active.closest("a, button, input, textarea, select, summary, [contenteditable='true']"))
    ) {
      return;
    }

    let targetIndex = currentIndex;
    if (event.key === "ArrowLeft") targetIndex -= 1;
    if (event.key === "ArrowRight") targetIndex += 1;
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = pages.length - 1;
    if (targetIndex === currentIndex || targetIndex < 0 || targetIndex >= pages.length) {
      return;
    }

    event.preventDefault();
    navigateTo(targetIndex);
  });

  window.addEventListener("beforeprint", () => {
    printState = {
      isBookOpen,
      introHidden: bookIntro.hidden,
      shellHidden: portfolioShell.hidden
    };
    bookIntro.hidden = true;
    portfolioShell.hidden = false;
    portfolioShell.inert = false;
    pages.forEach((page) => {
      page.hidden = false;
    });
  });

  window.addEventListener("afterprint", () => {
    pages.forEach((page, index) => {
      page.hidden = index !== currentIndex;
    });
    if (printState) {
      bookIntro.hidden = printState.introHidden;
      portfolioShell.hidden = printState.shellHidden;
      portfolioShell.inert = !printState.isBookOpen;
    }
    printState = null;
  });

  const initialHash = decodedHash();
  const initialPageId = validPageId(initialHash);

  if (initialHash && !initialPageId) {
    history.replaceState({ view: "book", page: "profile" }, "", "#profile");
  } else if (!history.state) {
    history.replaceState(
      initialPageId
        ? { view: "book", page: initialPageId }
        : { view: "cover", page: "profile" },
      "",
      initialPageId ? "#" + initialPageId : cleanUrl()
    );
  }

  currentIndex = initialPageId ? pageIds.indexOf(initialPageId) : 0;
  pages.forEach((page, index) => {
    page.hidden = index !== currentIndex;
    page.classList.toggle("is-active", index === currentIndex);
  });

  updateNavigation(currentIndex);
  if (initialPageId || (initialHash && !initialPageId)) {
    setBookOpen(true, { animate: false, focusHeading: false });
    window.addEventListener(
      "load",
      () => window.requestAnimationFrame(scrollToPageStart),
      { once: true }
    );
  } else {
    setBookOpen(false, { animate: false, returnFocus: false });
  }

  document.documentElement.classList.add("portfolio-ready");
})();
