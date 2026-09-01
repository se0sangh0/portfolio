(() => {
  "use strict";

  const pageStage = document.querySelector(".page-stage");
  const pages = Array.from(document.querySelectorAll(".notebook-page"));
  const indexLinks = Array.from(document.querySelectorAll(".index-nav [data-page-link]"));
  const allPageLinks = Array.from(document.querySelectorAll("[data-page-link]"));
  const menuToggle = document.getElementById("menu-toggle");
  const menuBackdrop = document.getElementById("menu-backdrop");
  const indexPage = document.getElementById("portfolio-index");
  const previousButton = document.getElementById("previous-page");
  const nextButton = document.getElementById("next-page");
  const previousTitle = document.getElementById("previous-title");
  const nextTitle = document.getElementById("next-title");
  const pageCounter = document.getElementById("page-counter");
  const mobileCurrentTitle = document.getElementById("mobile-current-title");
  const announcer = document.getElementById("page-announcer");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pageIds = pages.map((page) => page.id);
  const pageTitles = pages.map((page) => page.dataset.pageTitle || page.id);
  const baseTitle = "서상호 포트폴리오";
  let currentIndex = 0;
  let animationTimer = 0;
  let isPrinting = false;

  if (!pageStage || pages.length === 0) return;

  function idFromHash() {
    const rawHash = window.location.hash.slice(1);
    if (!rawHash) return "profile";
    try {
      return decodeURIComponent(rawHash);
    } catch {
      return "profile";
    }
  }

  function validPageId(id) {
    return pageIds.includes(id) ? id : "profile";
  }

  function titleFor(index) {
    return pageTitles[index] || "";
  }

  function updateNavigation(index) {
    const pageId = pageIds[index];

    indexLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === "#" + pageId;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    pageCounter.textContent = String(index).padStart(2, "0") + " / " + String(pages.length - 1).padStart(2, "0");
    mobileCurrentTitle.textContent = titleFor(index);
    document.title = titleFor(index) + " | " + baseTitle;

    previousButton.disabled = index === 0;
    nextButton.disabled = index === pages.length - 1;
    previousTitle.textContent = index > 0 ? titleFor(index - 1) : "첫 기록";
    nextTitle.textContent = index < pages.length - 1 ? titleFor(index + 1) : "마지막 기록";
  }

  function playPageTurn(direction) {
    window.clearTimeout(animationTimer);
    pageStage.classList.remove("is-turning-next", "is-turning-previous");

    if (reducedMotion.matches) return;

    void pageStage.offsetWidth;
    pageStage.classList.add(direction === "previous" ? "is-turning-previous" : "is-turning-next");
    animationTimer = window.setTimeout(() => {
      pageStage.classList.remove("is-turning-next", "is-turning-previous");
    }, 430);
  }

  function scrollToPageStart() {
    const mobileOffset = window.matchMedia("(max-width: 1023px)").matches ? 66 : 18;
    const top = pageStage.getBoundingClientRect().top + window.scrollY - mobileOffset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion.matches ? "auto" : "smooth"
    });
  }

  function closeMenu(options = {}) {
    const { returnFocus = false } = options;
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    pageStage.inert = false;
    menuBackdrop.tabIndex = -1;
    if (returnFocus) menuToggle.focus();
  }

  function openMenu() {
    document.body.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    pageStage.inert = true;
    menuBackdrop.tabIndex = 0;
    const currentLink = indexLinks.find((link) => link.hasAttribute("aria-current")) || indexLinks[0];
    window.requestAnimationFrame(() => currentLink?.focus());
  }

  function activatePage(id, options = {}) {
    const {
      focusHeading = true,
      animate = true,
      scroll = true,
      announce = true
    } = options;
    const nextId = validPageId(id);
    const nextIndex = pageIds.indexOf(nextId);
    const previousIndex = currentIndex;
    const isSame = nextIndex === currentIndex && pages[currentIndex] && !pages[currentIndex].hidden;

    if (!isSame) {
      pages.forEach((page, index) => {
        const active = index === nextIndex;
        page.hidden = !active;
        page.classList.toggle("is-active", active);
      });
      currentIndex = nextIndex;
    }

    updateNavigation(nextIndex);
    closeMenu();

    if (animate && !isSame) {
      playPageTurn(nextIndex < previousIndex ? "previous" : "next");
    }

    const activeHeading = pages[nextIndex].querySelector("h1[tabindex='-1']");
    if (focusHeading && activeHeading) {
      window.requestAnimationFrame(() => activeHeading.focus({ preventScroll: true }));
    }
    if (scroll) {
      window.requestAnimationFrame(scrollToPageStart);
    }
    if (announce && !isSame) {
      announcer.textContent = titleFor(nextIndex) + ", " + (nextIndex + 1) + " / " + pages.length;
    }
  }

  function navigateTo(index, options = {}) {
    if (index < 0 || index >= pages.length) return;
    const id = pageIds[index];
    if (options.replace) {
      history.replaceState({ page: id }, "", "#" + id);
    } else {
      history.pushState({ page: id }, "", "#" + id);
    }
    activatePage(id, {
      focusHeading: true,
      animate: true,
      scroll: true,
      announce: true
    });
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
      event.preventDefault();
      navigateTo(pageIds.indexOf(id));
    });
  });

  previousButton.addEventListener("click", () => navigateTo(currentIndex - 1));
  nextButton.addEventListener("click", () => navigateTo(currentIndex + 1));

  menuToggle.addEventListener("click", () => {
    if (document.body.classList.contains("menu-open")) closeMenu({ returnFocus: true });
    else openMenu();
  });
  menuBackdrop.addEventListener("click", () => closeMenu({ returnFocus: true }));

  window.addEventListener("popstate", () => {
    activatePage(validPageId(idFromHash()), {
      focusHeading: true,
      animate: true,
      scroll: true,
      announce: true
    });
  });

  window.addEventListener("hashchange", () => {
    const hashIndex = pageIds.indexOf(validPageId(idFromHash()));
    if (hashIndex === currentIndex) return;
    activatePage(pageIds[hashIndex], {
      focusHeading: true,
      animate: true,
      scroll: true,
      announce: true
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key === "Tab" && document.body.classList.contains("menu-open")) {
      const focusable = Array.from(indexPage.querySelectorAll("a[href], button:not(:disabled)"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

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
    if (targetIndex === currentIndex || targetIndex < 0 || targetIndex >= pages.length) return;

    event.preventDefault();
    navigateTo(targetIndex);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1023 && document.body.classList.contains("menu-open")) {
      closeMenu();
    }
  });

  window.addEventListener("beforeprint", () => {
    isPrinting = true;
    pages.forEach((page) => {
      page.hidden = false;
    });
  });

  window.addEventListener("afterprint", () => {
    isPrinting = false;
    pages.forEach((page, index) => {
      page.hidden = index !== currentIndex;
    });
  });

  const initialId = validPageId(idFromHash());
  const initialIndex = pageIds.indexOf(initialId);
  if (window.location.hash && initialId !== idFromHash()) {
    history.replaceState({ page: initialId }, "", "#profile");
  }
  currentIndex = initialIndex;
  pages.forEach((page, index) => {
    page.hidden = index !== initialIndex;
    page.classList.toggle("is-active", index === initialIndex);
  });
  updateNavigation(initialIndex);

  if (isPrinting) {
    pages.forEach((page) => {
      page.hidden = false;
    });
  }
})();
