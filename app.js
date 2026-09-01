(() => {
  "use strict";

  const bookIntro = document.getElementById("book-intro");
  const portfolioShell = document.getElementById("portfolio-shell");
  const openNotebookButton = document.getElementById("open-notebook");
  const closeNotebookButton = document.getElementById("close-notebook");
  const pageStage = document.querySelector(".page-stage");
  const pages = Array.from(document.querySelectorAll(".notebook-page"));
  const portfolioImages = pages.flatMap((page) =>
    Array.from(page.querySelectorAll("img"))
  );
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
  let currentLeafIndex = 0;
  let currentAnchorIndex = 0;
  let resizeTimer = 0;
  let paginator = null;

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

  if (typeof window.createPortfolioPaginator === "function") {
    paginator = window.createPortfolioPaginator(pages);
    document.documentElement.classList.add("paged-ready");
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
    const leafState = paginator
      ? paginator.getState(pages[index])
      : { index: 0, count: 1, title: titleFor(index) };
    currentLeafIndex = leafState.index;
    currentAnchorIndex = leafState.anchor || 0;

    postitLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === "#" + pageId;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    pageCounter.textContent =
      String(index + 1).padStart(2, "0") +
      " / " +
      String(pages.length).padStart(2, "0") +
      " | " +
      String(leafState.index + 1) +
      " / " +
      String(leafState.count);
    currentPageTitle.textContent = titleFor(index);
    document.title = isBookOpen ? titleFor(index) + " | 서상호 포트폴리오" : baseTitle;

    const hasPrevious = leafState.index > 0;
    const hasNext = leafState.index < leafState.count - 1;
    const previousLeafTitle = hasPrevious && paginator
      ? paginator.titleAt(leafState.index - 1, pages[index])
      : titleFor(index);
    const nextLeafTitle = hasNext && paginator
      ? paginator.titleAt(leafState.index + 1, pages[index])
      : titleFor(index);
    previousButton.disabled = !hasPrevious;
    nextButton.disabled = !hasNext;
    if (edgePreviousButton && edgeNextButton) {
      edgePreviousButton.disabled = !hasPrevious;
      edgeNextButton.disabled = !hasNext;
    }
    previousTitle.textContent = hasPrevious
      ? previousLeafTitle
      : "첫 페이지";
    nextTitle.textContent = hasNext
      ? nextLeafTitle
      : "마지막 페이지";
    if (edgePreviousButton && edgeNextButton) {
      edgePreviousButton.setAttribute(
        "aria-label",
        hasPrevious
          ? "이전 쪽: " + previousLeafTitle + ", " + leafState.index + " / " + leafState.count
          : "이전 쪽 없음"
      );
      edgeNextButton.setAttribute(
        "aria-label",
        hasNext
          ? "다음 쪽: " + nextLeafTitle + ", " + (leafState.index + 2) + " / " + leafState.count
          : "다음 쪽 없음"
      );
      edgePreviousButton.title =
        hasPrevious ? "이전 쪽" : "이전 쪽 없음";
      edgeNextButton.title =
        hasNext ? "다음 쪽" : "다음 쪽 없음";
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
    }, 500);
  }

  function scrollToPageStart() {
    if (paginator && document.documentElement.classList.contains("paged-ready")) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
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

    if (paginator) {
      const leafState = paginator.prepareAtAnchor(
        pages[currentIndex],
        currentAnchorIndex,
        currentLeafIndex
      );
      currentLeafIndex = leafState?.index || 0;
      currentAnchorIndex = leafState?.anchor || 0;
      updateNavigation(currentIndex);
    }

    if (focusHeading) {
      const heading =
        currentLeafIndex === 0
          ? pages[currentIndex].querySelector("h1[tabindex='-1']")
          : pageStage;
      heading?.focus({ preventScroll: true });
    }
    scrollToPageStart();
    announcer.textContent =
      "포트폴리오 노트를 열었습니다. " +
      titleFor(currentIndex) +
      ", " +
      (currentLeafIndex + 1) +
      " / " +
      (paginator?.getState(pages[currentIndex]).count || 1);
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
      announce = true,
      leaf = 0,
      anchor = null
    } = options;
    const nextId = validPageId(id) || "profile";
    const nextIndex = pageIds.indexOf(nextId);
    const previousIndex = currentIndex;
    const previousLeafIndex = currentLeafIndex;
    const categoryChanged = nextIndex !== currentIndex;

    if (categoryChanged) {
      pages.forEach((page, index) => {
        const active = index === nextIndex;
        page.hidden = !active;
        page.classList.toggle("is-active", active);
      });
      currentIndex = nextIndex;
    }

    if (paginator && isBookOpen) {
      const leafState = categoryChanged
        ? paginator.prepareAtAnchor(pages[nextIndex], anchor, leaf)
        : Number.isInteger(anchor)
          ? paginator.setAnchor(anchor)
          : paginator.setLeaf(leaf);
      currentLeafIndex = leafState?.index || 0;
      currentAnchorIndex = leafState?.anchor || 0;
    } else {
      currentLeafIndex = typeof leaf === "number" ? Math.max(0, leaf) : 0;
      currentAnchorIndex = Number.isInteger(anchor) ? Math.max(0, anchor) : 0;
    }

    updateNavigation(nextIndex);

    if (
      animate &&
      isBookOpen &&
      (categoryChanged || currentLeafIndex !== previousLeafIndex)
    ) {
      const direction =
        nextIndex < previousIndex ||
        (nextIndex === previousIndex && currentLeafIndex < previousLeafIndex)
          ? "previous"
          : "next";
      playPageTurn(direction);
    }

    if (focusHeading && isBookOpen) {
      const focusTarget =
        currentLeafIndex === 0
          ? pages[nextIndex].querySelector("h1[tabindex='-1']")
          : pageStage;
      window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
    }
    if (announce && isBookOpen) {
      const leafState = paginator?.getState(pages[nextIndex]) || {
        index: 0,
        count: 1,
        title: titleFor(nextIndex)
      };
      announcer.textContent =
        titleFor(nextIndex) +
        ", " +
        leafState.title +
        ", " +
        (leafState.index + 1) +
        "쪽 / " +
        leafState.count +
        "쪽";
    }
  }

  function navigateTo(index, options = {}) {
    if (index < 0 || index >= pages.length) return;
    if (bookTransitioning) return;
    const id = pageIds[index];
    const openingFromCover = !isBookOpen;
    const targetLeaf = Number.isInteger(options.leaf) ? options.leaf : 0;
    const targetAnchor = Number.isInteger(options.anchor) ? options.anchor : 0;

    if (
      isBookOpen &&
      index === currentIndex &&
      currentLeafIndex === targetLeaf &&
      currentAnchorIndex === targetAnchor
    ) {
      activatePage(id, {
        focusHeading: true,
        animate: false,
        announce: false,
        leaf: targetLeaf,
        anchor: targetAnchor
      });
      return;
    }

    if (options.replace) {
      history.replaceState(
        { view: "book", page: id, leaf: targetLeaf, anchor: targetAnchor },
        "",
        "#" + id
      );
    } else {
      history.pushState(
        { view: "book", page: id, leaf: targetLeaf, anchor: targetAnchor },
        "",
        "#" + id
      );
    }

    activatePage(id, {
      focusHeading: false,
      animate: !openingFromCover,
      announce: !openingFromCover,
      leaf: targetLeaf,
      anchor: targetAnchor
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
        announce: false,
        leaf: targetLeaf,
        anchor: targetAnchor
      });
    }
  }

  function turnBookLeaf(direction, explicitIndex = null) {
    if (!isBookOpen || !paginator || bookTransitioning) return;
    const state = paginator.getState(pages[currentIndex]);
    const targetIndex =
      explicitIndex === null ? state.index + direction : explicitIndex;
    if (targetIndex < 0 || targetIndex >= state.count || targetIndex === state.index) {
      return;
    }

    if (pages[currentIndex].contains(document.activeElement)) {
      pageStage.focus({ preventScroll: true });
    }

    const nextState = paginator.setLeaf(targetIndex);
    currentLeafIndex = nextState.index;
    currentAnchorIndex = nextState.anchor;

    history.pushState(
      {
        view: "book",
        page: pageIds[currentIndex],
        leaf: nextState.index,
        anchor: nextState.anchor
      },
      "",
      "#" + pageIds[currentIndex]
    );

    playPageTurn(targetIndex < state.index ? "previous" : "next");
    updateNavigation(currentIndex);
    pageStage.focus({ preventScroll: true });
    announcer.textContent =
      titleFor(currentIndex) +
      ", " +
      nextState.title +
      ", " +
      (nextState.index + 1) +
      "쪽 / " +
      nextState.count +
      "쪽";
  }

  function closeNotebook(options = {}) {
    const { pushHistory = true, returnFocus = true } = options;
    if (!isBookOpen || bookTransitioning) return;

    if (pushHistory) {
      history.pushState(
        {
          view: "cover",
          page: pageIds[currentIndex],
          leaf: currentLeafIndex,
          anchor: currentAnchorIndex
        },
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
      history.replaceState(
        { view: "book", page: "profile", leaf: 0, anchor: 0 },
        "",
        "#profile"
      );
      activatePage("profile", {
        focusHeading: false,
        animate: false,
        announce: false,
        leaf: 0,
        anchor: 0
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
      const requestedLeaf = Number.isInteger(history.state?.leaf)
        ? history.state.leaf
        : 0;
      const requestedAnchor = Number.isInteger(history.state?.anchor)
        ? history.state.anchor
        : null;
      activatePage(pageId, {
        focusHeading: wasOpen && (options.focus ?? true),
        animate: wasOpen && (options.animate ?? true),
        announce: wasOpen,
        leaf: requestedLeaf,
        anchor: requestedAnchor
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
  previousButton.addEventListener("click", () => turnBookLeaf(-1));
  nextButton.addEventListener("click", () => turnBookLeaf(1));
  edgePreviousButton?.addEventListener("click", () => turnBookLeaf(-1));
  edgeNextButton?.addEventListener("click", () => turnBookLeaf(1));

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

    const leafState = paginator?.getState(pages[currentIndex]) || {
      index: 0,
      count: 1
    };
    if (event.key === "ArrowLeft" && leafState.index > 0) {
      event.preventDefault();
      turnBookLeaf(-1);
    }
    if (event.key === "ArrowRight" && leafState.index < leafState.count - 1) {
      event.preventDefault();
      turnBookLeaf(1);
    }
    if (event.key === "Home" && leafState.index > 0) {
      event.preventDefault();
      turnBookLeaf(-1, 0);
    }
    if (event.key === "End" && leafState.index < leafState.count - 1) {
      event.preventDefault();
      turnBookLeaf(1, leafState.count - 1);
    }
  });

  window.addEventListener("beforeprint", () => {
    printState = {
      isBookOpen,
      introHidden: bookIntro.hidden,
      shellHidden: portfolioShell.hidden,
      page: currentIndex,
      leaf: currentLeafIndex,
      anchor: currentAnchorIndex
    };
    paginator?.preparePrint();
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
      currentIndex = printState.page;
      currentLeafIndex = printState.leaf;
      currentAnchorIndex = printState.anchor;
      if (printState.isBookOpen) {
        paginator?.restoreAfterPrint(
          pages[currentIndex],
          currentLeafIndex,
          currentAnchorIndex
        );
      }
      updateNavigation(currentIndex);
    }
    printState = null;
  });

  const initialHash = decodedHash();
  const initialPageId = validPageId(initialHash);

  if (initialHash && !initialPageId) {
    history.replaceState(
      { view: "book", page: "profile", leaf: 0, anchor: 0 },
      "",
      "#profile"
    );
  } else if (!history.state) {
    history.replaceState(
      initialPageId
        ? { view: "book", page: initialPageId, leaf: 0, anchor: 0 }
        : { view: "cover", page: "profile", leaf: 0, anchor: 0 },
      "",
      initialPageId ? "#" + initialPageId : cleanUrl()
    );
  }

  currentIndex = initialPageId ? pageIds.indexOf(initialPageId) : 0;
  currentLeafIndex = Number.isInteger(history.state?.leaf)
    ? history.state.leaf
    : 0;
  currentAnchorIndex = Number.isInteger(history.state?.anchor)
    ? history.state.anchor
    : 0;
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

  function scheduleRepagination() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!isBookOpen || !paginator || printState || pageStage.clientHeight === 0) {
        return;
      }
      const leafState = paginator.repackActive();
      currentLeafIndex = leafState?.index || 0;
      currentAnchorIndex = leafState?.anchor || 0;
      history.replaceState(
        {
          view: "book",
          page: pageIds[currentIndex],
          leaf: currentLeafIndex,
          anchor: currentAnchorIndex
        },
        "",
        "#" + pageIds[currentIndex]
      );
      updateNavigation(currentIndex);
    }, 80);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleRepagination);
    resizeObserver.observe(pageStage);
  } else {
    window.addEventListener("resize", scheduleRepagination);
  }

  document.fonts?.ready.then(scheduleRepagination);
  portfolioImages.forEach((image) => {
    if (!image.complete) {
      image.addEventListener("load", scheduleRepagination, { once: true });
      image.addEventListener("error", scheduleRepagination, { once: true });
    }
  });

  document.documentElement.classList.add("portfolio-ready");
})();
