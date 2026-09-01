(() => {
  "use strict";

  function removeIdentity(node) {
    node.removeAttribute("id");
    node.removeAttribute("aria-labelledby");
    node.removeAttribute("aria-describedby");
    return node;
  }

  function generatedHeading(title) {
    const header = document.createElement("header");
    header.className = "book-fragment-heading";
    const heading = document.createElement("h2");
    heading.textContent = title;
    header.append(heading);
    return header;
  }

  function readableText(node) {
    if (!node) return "";
    return Array.from(node.childNodes)
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.textContent || "";
        if (child.nodeName === "BR") return " ";
        return readableText(child);
      })
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  function unitTitle(node, fallback) {
    const heading = node.querySelector("h1, h2, h3, summary, strong");
    return readableText(heading) || fallback;
  }

  function markUnit(node, title) {
    node.classList.add("book-page-unit");
    node.dataset.bookUnitTitle = title;
    return node;
  }

  function fragmentShell(source, title, continued = false) {
    const shell = removeIdentity(source.cloneNode(false));
    shell.classList.add("book-fragment");
    if (continued) shell.append(generatedHeading(title + " 계속"));
    return shell;
  }

  function splitDirectChildren(node, chunkSize, title) {
    const children = Array.from(node.children);
    const units = [];
    for (let index = 0; index < children.length; index += chunkSize) {
      const chunk = children.slice(index, index + chunkSize);
      const shell = removeIdentity(node.cloneNode(false));
      shell.classList.add("book-fragment");
      if (chunk.length === 1) shell.classList.add("book-fragment--single");
      chunk.forEach((child) => shell.append(child));
      units.push(markUnit(shell, unitTitle(shell, title)));
    }
    node.remove();
    return units;
  }

  function splitSectionItems(section, containerSelector, chunkSize, title) {
    const heading = section.querySelector(":scope > .section-heading");
    const container = section.querySelector(containerSelector);
    if (!container) return [markUnit(section, unitTitle(section, title))];

    const items = Array.from(container.children);
    const extras = Array.from(section.children).filter(
      (child) => child !== heading && child !== container
    );
    const units = [];

    if (heading) {
      const headingShell = fragmentShell(section, title, false);
      headingShell.append(heading);
      units.push(markUnit(headingShell, title));
    }

    for (let index = 0; index < items.length; index += chunkSize) {
      const chunk = items.slice(index, index + chunkSize);
      const shell = fragmentShell(section, title, false);
      const inner = removeIdentity(container.cloneNode(false));
      inner.classList.add("book-fragment-grid");
      if (chunk.length === 1) inner.classList.add("book-fragment-grid--single");
      chunk.forEach((item) => inner.append(item));
      shell.append(inner);
      units.push(markUnit(shell, unitTitle(shell, title)));
    }

    extras.forEach((extra) => {
      if (extra.matches(".record-note")) {
        units.push(markUnit(extra, unitTitle(extra, title + " 메모")));
        return;
      }
      if (extra.matches(".link-row")) {
        const last = units[units.length - 1];
        if (last) last.append(extra);
        else units.push(markUnit(extra, title));
        return;
      }
      units.push(...atomizeNode(extra, title));
    });
    section.remove();
    return units;
  }

  function splitListSection(section, listSelector, itemSelector, chunkSize, title) {
    const heading = section.querySelector(":scope > .section-heading");
    const list = section.querySelector(listSelector);
    if (!list) return [markUnit(section, unitTitle(section, title))];

    const items = Array.from(list.querySelectorAll(itemSelector));
    const extras = Array.from(section.children).filter(
      (child) => child !== heading && child !== list
    );
    const units = [];

    if (heading) {
      const headingShell = fragmentShell(section, title, false);
      headingShell.append(heading);
      units.push(markUnit(headingShell, title));
    }

    for (let index = 0; index < items.length; index += chunkSize) {
      const chunk = items.slice(index, index + chunkSize);
      const shell = fragmentShell(section, title, false);
      const inner = removeIdentity(list.cloneNode(false));
      inner.classList.add("book-fragment-grid");
      if (chunk.length === 1) inner.classList.add("book-fragment-grid--single");
      chunk.forEach((item) => inner.append(item));
      shell.append(inner);
      units.push(markUnit(shell, unitTitle(shell, title)));
    }

    extras.forEach((extra) => units.push(...atomizeNode(extra, title)));
    section.remove();
    return units;
  }

  function splitDirectItemsSection(section, itemSelector, chunkSize, title) {
    const heading = section.querySelector(":scope > .section-heading");
    const items = Array.from(section.querySelectorAll(itemSelector));
    const extras = Array.from(section.children).filter(
      (child) => child !== heading && !items.includes(child)
    );
    if (!items.length) return [markUnit(section, unitTitle(section, title))];

    const units = [];
    if (heading) {
      const headingShell = fragmentShell(section, title, false);
      headingShell.append(heading);
      units.push(markUnit(headingShell, title));
    }
    for (let index = 0; index < items.length; index += chunkSize) {
      const shell = fragmentShell(section, title, false);
      items
        .slice(index, index + chunkSize)
        .forEach((item) => shell.append(item));
      units.push(markUnit(shell, unitTitle(shell, title)));
    }
    extras.forEach((extra) => units.push(...atomizeNode(extra, title)));
    section.remove();
    return units;
  }

  function splitCaseStudy(caseStudy) {
    const units = [];
    const title = unitTitle(caseStudy, "프로젝트");
    const mediaFigure = caseStudy.querySelector(":scope > figure");
    const contentRoot = caseStudy.querySelector(":scope > div") || caseStudy;
    const points = contentRoot.querySelector(":scope > .case-points");
    const boundary = contentRoot.querySelector(":scope > .case-boundary");
    const textLink = contentRoot.querySelector(":scope > .text-link");
    const introChildren = Array.from(contentRoot.children).filter(
      (child) =>
        child !== points &&
        child !== boundary &&
        child !== textLink &&
        child !== mediaFigure
    );

    if (introChildren.length) {
      const introShell = removeIdentity(caseStudy.cloneNode(false));
      introShell.classList.add("book-fragment", "book-fragment--case");
      introChildren.forEach((child) => introShell.append(child));
      units.push(markUnit(introShell, title));
    }

    if (points) {
      const pointItems = Array.from(points.children);
      for (let index = 0; index < pointItems.length; index += 2) {
        const detailShell = removeIdentity(caseStudy.cloneNode(false));
        detailShell.classList.add("book-fragment", "book-fragment--case");
        detailShell.append(generatedHeading(title + " 상세"));
        const pointList = removeIdentity(points.cloneNode(false));
        pointItems.slice(index, index + 2).forEach((item) => pointList.append(item));
        detailShell.append(pointList);
        units.push(markUnit(detailShell, title + " 상세"));
      }
    }

    if (boundary || textLink) {
      const noteShell = removeIdentity(caseStudy.cloneNode(false));
      noteShell.classList.add("book-fragment", "book-fragment--case");
      noteShell.append(generatedHeading(title + " 범위"));
      if (boundary) noteShell.append(boundary);
      if (textLink) noteShell.append(textLink);
      units.push(markUnit(noteShell, title + " 범위"));
    }

    if (mediaFigure) {
      const figureShell = document.createElement("section");
      figureShell.className = "book-fragment book-fragment--media";
      figureShell.append(generatedHeading(title + " 자료"), mediaFigure);
      units.push(markUnit(figureShell, title + " 자료"));
    }
    caseStudy.remove();
    return units;
  }

  function splitCaseList(section) {
    const cases = Array.from(section.querySelectorAll(":scope > .case-study"));
    const units = [];
    cases.forEach((item) => units.push(...splitCaseStudy(item)));
    section.remove();
    return units;
  }

  function splitDetails(details, title, chunkSize) {
    const summary = details.querySelector(":scope > summary");
    const grid = details.querySelector(
      ":scope > .design-note__grid, :scope > .document-grid"
    );
    if (!grid) return [markUnit(details, title)];

    const items = Array.from(grid.children);
    const units = [];
    for (let index = 0; index < items.length; index += chunkSize) {
      const shell = document.createElement("section");
      shell.className = "book-fragment book-fragment--details";
      shell.append(generatedHeading(index === 0 ? title : title + " 계속"));
      const inner = removeIdentity(grid.cloneNode(false));
      inner.classList.add("book-fragment-grid");
      items.slice(index, index + chunkSize).forEach((item) => inner.append(item));
      shell.append(inner);
      units.push(markUnit(shell, index === 0 ? title : title + " 계속"));
    }
    summary?.remove();
    details.remove();
    return units;
  }

  function splitContactCard(section) {
    const children = Array.from(section.children);
    const linksIndex = children.findIndex((child) => child.matches(".contact-links"));
    if (linksIndex < 0) return [markUnit(section, "연락")];

    const intro = removeIdentity(section.cloneNode(false));
    intro.classList.add("book-fragment", "book-fragment--contact");
    children.slice(0, linksIndex).forEach((child) => intro.append(child));

    const links = document.createElement("section");
    links.className = "book-fragment book-fragment--contact-links";
    links.append(generatedHeading("연락처"), children[linksIndex]);
    section.remove();
    return [markUnit(intro, "연락"), markUnit(links, "연락처")];
  }

  function splitPrivacyNote(section) {
    const children = Array.from(section.children);
    if (children.length < 3) return [markUnit(section, "공개 범위")];

    const titleShell = removeIdentity(section.cloneNode(false));
    titleShell.classList.add("book-fragment", "book-fragment--single");
    children.slice(0, 2).forEach((child) => titleShell.append(child));

    const bodyShell = removeIdentity(section.cloneNode(false));
    bodyShell.classList.add("book-fragment", "book-fragment--single");
    bodyShell.append(generatedHeading("공개 원칙"));
    children.slice(2).forEach((child) => bodyShell.append(child));
    section.remove();
    return [
      markUnit(titleShell, "공개 범위"),
      markUnit(bodyShell, "공개 원칙")
    ];
  }

  function splitRecordHeading(header, fallbackTitle) {
    const children = Array.from(header.children);
    const leadIndex = children.findIndex((child) =>
      child.matches(".record-lead, .profile-signature")
    );
    if (leadIndex <= 0) {
      return [markUnit(header, unitTitle(header, fallbackTitle))];
    }

    const title = unitTitle(header, fallbackTitle);
    const titleHeader = removeIdentity(header.cloneNode(false));
    titleHeader.classList.add("book-fragment", "book-fragment--record-title");
    children.slice(0, leadIndex).forEach((child) => titleHeader.append(child));

    const introHeader = removeIdentity(header.cloneNode(false));
    introHeader.classList.add("book-fragment", "book-fragment--record-intro");
    introHeader.append(generatedHeading("소개"));
    children.slice(leadIndex).forEach((child) => introHeader.append(child));
    header.remove();
    return [
      markUnit(titleHeader, title),
      markUnit(introHeader, title + " 소개")
    ];
  }

  function splitProfileGrid(section) {
    const prose = section.querySelector(":scope > .prose");
    const aside = section.querySelector(":scope > .margin-note");
    if (!prose || !aside) return splitDirectChildren(section, 1, "프로필");

    const proseChildren = Array.from(prose.children);
    const firstShell = removeIdentity(section.cloneNode(false));
    firstShell.classList.add("book-fragment", "book-fragment--single");
    const firstProse = removeIdentity(prose.cloneNode(false));
    proseChildren.slice(0, 3).forEach((child) => firstProse.append(child));
    firstShell.append(firstProse);

    const secondShell = removeIdentity(section.cloneNode(false));
    secondShell.classList.add("book-fragment", "book-fragment--single");
    secondShell.append(generatedHeading("현재 역할"));
    const secondProse = removeIdentity(prose.cloneNode(false));
    proseChildren.slice(3).forEach((child) => secondProse.append(child));
    secondShell.append(secondProse);

    const asideLabel = aside.querySelector(":scope > .section-label");
    const asideList = aside.querySelector(":scope > .check-list");
    const asideItems = asideList ? Array.from(asideList.children) : [];
    const asideUnits = [];
    for (let index = 0; index < asideItems.length; index += 2) {
      const asideShell = removeIdentity(section.cloneNode(false));
      asideShell.classList.add("book-fragment", "book-fragment--single");
      const asideClone = removeIdentity(aside.cloneNode(false));
      if (index === 0 && asideLabel) asideClone.append(asideLabel);
      if (index > 0) asideClone.append(generatedHeading("핵심 역량 계속"));
      const listClone = removeIdentity(asideList.cloneNode(false));
      asideItems.slice(index, index + 2).forEach((item) => listClone.append(item));
      asideClone.append(listClone);
      asideShell.append(asideClone);
      asideUnits.push(
        markUnit(asideShell, index === 0 ? "핵심 역량" : "핵심 역량 계속")
      );
    }
    section.remove();
    return [
      markUnit(firstShell, "소개"),
      markUnit(secondShell, "현재 역할"),
      ...asideUnits
    ];
  }

  function atomizeNode(node, fallbackTitle) {
    if (node.matches(".record-heading")) {
      return splitRecordHeading(node, fallbackTitle);
    }
    if (node.matches(".privacy-note")) {
      return splitPrivacyNote(node);
    }
    if (node.matches(".project-hero, .milestone-band, .record-note, .hand-note")) {
      return [markUnit(node, unitTitle(node, fallbackTitle))];
    }
    if (node.matches(".profile-grid")) {
      return splitProfileGrid(node);
    }
    if (node.matches(".project-summary, .activity-feature")) {
      return splitDirectChildren(node, 1, fallbackTitle);
    }
    if (node.matches(".method-strip")) {
      return splitDirectChildren(node, 2, "기획 과정");
    }
    if (node.matches(".system-flow")) {
      return splitDirectChildren(node, 2, "시스템 흐름");
    }
    if (node.matches(".capability-ledger")) {
      return splitDirectChildren(node, 1, "역량");
    }
    if (node.matches(".boundary-grid, .participation-note")) {
      return splitDirectChildren(node, 1, fallbackTitle);
    }
    if (node.matches(".detail-ledger")) {
      return splitSectionItems(node, ".detail-ledger__grid", 1, "설계 사례");
    }
    if (node.matches(".decision-record")) {
      return splitSectionItems(node, ".decision-grid", 1, "주요 결정");
    }
    if (node.matches(".ownership-block")) {
      return splitListSection(node, ".ownership-list", ":scope > li", 1, "담당 범위");
    }
    if (node.matches(".system-record")) {
      return splitListSection(node, ".system-flow", ":scope > li", 3, "시스템 흐름");
    }
    if (node.matches(".build-sequence")) {
      return splitListSection(node, "ol", ":scope > li", 2, "진행 과정");
    }
    if (node.matches(".defense-flow")) {
      return splitListSection(node, "ol", ":scope > li", 2, "방어 흐름");
    }
    if (node.matches(".verification-band")) {
      return splitDirectChildren(node, 1, "검증 범위");
    }
    if (node.matches(".project-atlas")) {
      return splitSectionItems(node, ".atlas-grid", 1, "프로젝트 지도");
    }
    if (node.matches(".evidence-strip")) {
      const media = node.querySelector(".media-grid");
      return media
        ? splitSectionItems(node, ".media-grid", 1, "자료")
        : [markUnit(node, "자료")];
    }
    if (node.matches(".case-list")) {
      return splitCaseList(node);
    }
    if (node.matches(".experience-ledger")) {
      return splitDirectItemsSection(node, ":scope > .experience-row", 2, "현장 경험");
    }
    if (node.matches(".recognition-ledger")) {
      return splitDirectItemsSection(node, ":scope > .award-row", 1, "수상과 선정");
    }
    if (node.matches(".learning-grid")) {
      return splitDirectItemsSection(
        node,
        ":scope > div:not(.section-heading)",
        1,
        "학습"
      );
    }
    if (node.matches(".archive-section")) {
      return splitSectionItems(node, ".document-grid", 2, "수상 증빙");
    }
    if (node.matches(".design-note")) {
      return splitDetails(node, "핵심 시스템 기획", 1);
    }
    if (node.matches(".archive-details")) {
      return splitDetails(node, "교육 수료 증빙", 2);
    }
    if (node.matches(".contact-card")) {
      return splitContactCard(node);
    }
    return [markUnit(node, unitTitle(node, fallbackTitle))];
  }

  function createLeaf(article) {
    const leaf = document.createElement("section");
    leaf.className = "book-leaf";
    leaf.setAttribute("role", "group");
    leaf.setAttribute("aria-roledescription", "책 쪽");
    article.append(leaf);
    return leaf;
  }

  window.createPortfolioPaginator = function createPortfolioPaginator(articles) {
    const states = new Map();
    let activeArticle = null;
    const spreadMedia = window.matchMedia(
      "(min-width: 1180px) and (min-height: 650px)"
    );

    function usesSpread() {
      return spreadMedia.matches;
    }

    function onModeChange(listener) {
      spreadMedia.addEventListener("change", listener);
      return () => spreadMedia.removeEventListener("change", listener);
    }

    function spreadStart(index) {
      return usesSpread() ? Math.floor(index / 2) * 2 : index;
    }

    articles.forEach((article) => {
      const nodes = Array.from(article.children);
      const units = [];
      nodes.forEach((node) =>
        units.push(...atomizeNode(node, article.dataset.pageTitle || article.id))
      );
      units.forEach((unit, index) => {
        unit.dataset.bookUnitIndex = String(index);
      });
      article.replaceChildren();
      states.set(article, {
        units,
        leaves: [],
        index: 0,
        cursor: 0,
        prepared: false
      });
    });

    function applyLeafState(article, requestedIndex) {
      const state = states.get(article);
      if (!state) return null;
      if (!state.leaves.length) {
        state.index = 0;
        state.cursor = 0;
        return getState(article);
      }

      const safeIndex = Math.max(
        0,
        Math.min(requestedIndex, state.leaves.length - 1)
      );
      const visibleStart = spreadStart(safeIndex);
      const visibleEnd = Math.min(
        visibleStart + (usesSpread() ? 1 : 0),
        state.leaves.length - 1
      );
      state.index = visibleStart;
      state.cursor = safeIndex;
      article.classList.toggle("is-spread-layout", usesSpread());
      article.classList.toggle(
        "is-odd-spread-end",
        usesSpread() && visibleStart === visibleEnd
      );
      article.dataset.visibleStart = String(visibleStart);
      article.dataset.visibleEnd = String(visibleEnd);

      state.leaves.forEach((leaf, index) => {
        const active = index >= visibleStart && index <= visibleEnd;
        leaf.hidden = !active;
        leaf.inert = !active;
        leaf.setAttribute("aria-hidden", String(!active));
        if (active) {
          leaf.classList.toggle(
            "book-leaf--scrollable",
            leaf.scrollHeight > leaf.clientHeight + 1
          );
        }
      });
      return getState(article);
    }

    function leafOverflows(leaf) {
      const lastUnit = leaf.lastElementChild;
      if (!lastUnit) return false;

      const leafRect = leaf.getBoundingClientRect();
      const leafStyle = window.getComputedStyle(leaf);
      const lastStyle = window.getComputedStyle(lastUnit);
      const paddingBottom = Number.parseFloat(leafStyle.paddingBottom) || 0;
      const marginBottom = Number.parseFloat(lastStyle.marginBottom) || 0;
      const contentBottom = lastUnit.getBoundingClientRect().bottom + marginBottom;
      const safeBottom = leafRect.bottom - paddingBottom - 8;

      return (
        leaf.scrollHeight > leaf.clientHeight + 1 ||
        contentBottom > safeBottom + 0.5
      );
    }

    function refreshContinuationHeadings(leaf) {
      let previousTitle = "";
      Array.from(leaf.children).forEach((unit) => {
        const title = unit.dataset.bookUnitTitle || "";
        unit.classList.toggle(
          "book-page-unit--same-title",
          Boolean(title && title === previousTitle)
        );
        previousTitle = title;
      });
    }

    function labelLeaves(article) {
      const state = states.get(article);
      if (!state) return;
      const total = state.leaves.length;
      state.leaves.forEach((leaf, index) => {
        const title = leaf.querySelector(".book-page-unit")?.dataset.bookUnitTitle ||
          article.dataset.pageTitle ||
          article.id;
        const side = index % 2 === 0 ? "왼쪽" : "오른쪽";
        const sideLabel = usesSpread() ? side + ", " : "";
        leaf.dataset.leafTitle = title;
        leaf.dataset.leafIndex = String(index);
        leaf.dataset.pageNumber = String(index + 1).padStart(
          String(total).length,
          "0"
        );
        leaf.classList.toggle("book-leaf--left", index % 2 === 0);
        leaf.classList.toggle("book-leaf--right", index % 2 === 1);
        leaf.setAttribute(
          "aria-label",
          title + ", " + sideLabel + (index + 1) + "쪽 / " + total + "쪽"
        );
        leaf.setAttribute("aria-posinset", String(index + 1));
        leaf.setAttribute("aria-setsize", String(total));
      });
    }

    function normalizeLeaves(article) {
      const state = states.get(article);
      if (!state) return;

      state.leaves.forEach((leaf) => {
        leaf.hidden = true;
        leaf.inert = true;
      });

      for (let index = 0; index < state.leaves.length; index += 1) {
        const leaf = state.leaves[index];
        leaf.hidden = false;
        leaf.style.visibility = "hidden";

        while (leafOverflows(leaf) && leaf.children.length > 1) {
          const unit = leaf.lastElementChild;
          let nextLeaf = state.leaves[index + 1];
          if (!nextLeaf) {
            nextLeaf = createLeaf(article);
            nextLeaf.hidden = true;
            nextLeaf.inert = true;
            state.leaves.push(nextLeaf);
          }
          nextLeaf.prepend(unit);
          refreshContinuationHeadings(leaf);
          refreshContinuationHeadings(nextLeaf);
        }

        leaf.style.removeProperty("visibility");
        leaf.hidden = true;
        leaf.inert = true;
      }
    }

    function prepare(article, requestedIndex = 0) {
      const state = states.get(article);
      if (!state) return null;
      activeArticle = article;

      const currentUnits = state.units.slice();
      article.replaceChildren();
      state.leaves = [];

      let leaf = createLeaf(article);
      state.leaves.push(leaf);
      let unitCount = 0;
      const overflows = () => leafOverflows(leaf);

      currentUnits.forEach((unit) => {
        leaf.append(unit);
        refreshContinuationHeadings(leaf);
        unitCount += 1;

        if (overflows() && unitCount > 1) {
          leaf.removeChild(unit);
          refreshContinuationHeadings(leaf);
          leaf.hidden = true;
          leaf.inert = true;
          leaf = createLeaf(article);
          state.leaves.push(leaf);
          leaf.append(unit);
          refreshContinuationHeadings(leaf);
          unitCount = 1;
        }

        if (overflows() && unitCount === 1) {
          leaf.classList.add("book-leaf--scrollable");
        }
      });

      state.prepared = true;
      normalizeLeaves(article);
      labelLeaves(article);
      return applyLeafState(article, requestedIndex === "last"
        ? state.leaves.length - 1
        : requestedIndex);
    }

    function getState(article = activeArticle) {
      const state = states.get(article);
      if (!state) {
        return {
          index: 0,
          count: 1,
          title: "",
          visibleStart: 0,
          visibleEnd: 0,
          step: 1,
          spread: false
        };
      }
      const count = Math.max(1, state.leaves.length);
      const visibleStart = spreadStart(
        Math.max(0, Math.min(state.cursor, count - 1))
      );
      const visibleEnd = Math.min(
        visibleStart + (usesSpread() ? 1 : 0),
        count - 1
      );
      const cursor = Math.max(0, Math.min(state.cursor, count - 1));
      const leaf = state.leaves[cursor];
      const firstUnit = leaf?.querySelector(":scope > .book-page-unit");
      const anchor = firstUnit ? state.units.indexOf(firstUnit) : 0;
      return {
        index: cursor,
        count,
        title:
          leaf?.dataset.leafTitle ||
          article.dataset.pageTitle ||
          article.id,
        anchor: Math.max(0, anchor),
        visibleStart,
        visibleEnd,
        step: usesSpread() ? 2 : 1,
        spread: usesSpread(),
        scrollable: state.leaves
          .slice(visibleStart, visibleEnd + 1)
          .some((item) => item.classList.contains("book-leaf--scrollable"))
      };
    }

    function titleAt(index, article = activeArticle) {
      const state = states.get(article);
      if (!state || !state.leaves.length) {
        return article?.dataset.pageTitle || article?.id || "";
      }
      const safeIndex = Math.max(0, Math.min(index, state.leaves.length - 1));
      return state.leaves[safeIndex]?.dataset.leafTitle ||
        article.dataset.pageTitle ||
        article.id;
    }

    function anchorAtLeaf(index, article = activeArticle) {
      const state = states.get(article);
      if (!state || !state.leaves.length) return 0;
      const safeIndex = Math.max(0, Math.min(index, state.leaves.length - 1));
      const unit = state.leaves[safeIndex]?.querySelector(
        ":scope > .book-page-unit"
      );
      return Math.max(0, unit ? state.units.indexOf(unit) : 0);
    }

    function setLeaf(index) {
      if (!activeArticle) return null;
      return applyLeafState(activeArticle, index);
    }

    function setAnchor(anchorIndex) {
      if (!activeArticle) return null;
      const state = states.get(activeArticle);
      if (!state || !state.units.length) return getState(activeArticle);
      const safeAnchor = Math.max(0, Math.min(anchorIndex, state.units.length - 1));
      const anchorUnit = state.units[safeAnchor];
      const leafIndex = state.leaves.findIndex((leaf) => leaf.contains(anchorUnit));
      return applyLeafState(activeArticle, leafIndex < 0 ? 0 : leafIndex);
    }

    function prepareAtAnchor(article, anchorIndex, fallbackIndex = 0) {
      const prepared = prepare(article, fallbackIndex);
      return Number.isInteger(anchorIndex) ? setAnchor(anchorIndex) : prepared;
    }

    function repackActive(anchorIndex = null) {
      if (!activeArticle) return null;
      const current = getState(activeArticle);
      prepare(activeArticle, 0);
      return setAnchor(Number.isInteger(anchorIndex) ? anchorIndex : current.anchor);
    }

    function preparePrint() {
      articles.forEach((article) => {
        const state = states.get(article);
        if (!state) return;
        article.replaceChildren(...state.units);
        state.leaves = [];
        state.prepared = false;
      });
    }

    function restoreAfterPrint(article, leafIndex, anchorIndex) {
      return prepareAtAnchor(article, anchorIndex, leafIndex);
    }

    return {
      prepare,
      prepareAtAnchor,
      setLeaf,
      setAnchor,
      getState,
      titleAt,
      anchorAtLeaf,
      usesSpread,
      onModeChange,
      repackActive,
      preparePrint,
      restoreAfterPrint,
      states
    };
  };
})();
