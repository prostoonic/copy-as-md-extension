// ==UserScript==
// @name         Copy-review-as-markdown
// @namespace    http://tampermonkey.net/
// @version      2026-02-06
// @description  The script adds a “Copy” button to elements on the page and allows you to quickly copy the required text (URL, value, or block content) to the clipboard with a single click.
// @author       Andrei Fedorov, Artem Stralenia
// @match        https://preax.ru/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  const REVIEW_WRAPPER_SELECTOR =
    "section[class^='FormatFeedback_answerSection']";
  const IMAGE_WRAPPER_SELECTOR = "[class^='ImgBlock_imgWrapper']";
  const BTN_ATTR = "data-copy-md-btn";

  function getReactFiber(dom) {
    for (const key in dom) {
      if (key.startsWith("__reactFiber$")) {
        return dom[key];
      }
    }
    return null;
  }

  function findComponentFiber(fiber) {
    let current = fiber;

    while (current) {
      if (typeof current.type === "function") {
        return current;
      }
      current = current.return;
    }

    return null;
  }

  function getPropsFromComponent(component) {
    const fiber = getReactFiber(component);
    if (!fiber) return null;

    const componentFiber = findComponentFiber(fiber);
    if (!componentFiber) return null;

    return {
      name: componentFiber.type.name || "Anonymous",
      props: componentFiber.memoizedProps,
    };
  }

  function getSectionName(index) {
    switch (index) {
      case 0:
        return "# Плюсы";
      case 1:
        return "# Баги";
      case 2:
        return "# Рекомендации";
      default:
        return "# Оник облажался((";
    }
  }

  function getFiles(filesArray) {
    return filesArray.reduce((acc, cur) => acc + `![](${cur})\n`, "");
  }

  function addButtonInReview(reviewElem) {
    if (!reviewElem || reviewElem.querySelector(`button[${BTN_ATTR}]`)) return;

    reviewElem.style.position = "relative";

    const button = document.createElement("button");
    button.setAttribute(BTN_ATTR, "1");

    const style = document.createElement("style");
    style.innerHTML = `
            .ciamd-button-review {
            position: absolute;
            right: 0px;
            top: -8px;
            width: 32px;
            height: 32px;
            background: transparent;
            border: none;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            fill: #c5c7cb;
            z-index: 20;
            cursor: pointer;
            }

            .ciamd-button-review:hover {
            fill: #e5e7eb;
            }
        `;

    button.classList.add("ciamd-button-review");

    button.innerHTML = `
            <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24">
                <g><rect fill="none" height="24" width="24"></rect></g>
                <g><path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"></path></g>
            </svg>
        `;

    button.addEventListener("click", (e) => {
      let mdText;

      const feedbackArray =
        getPropsFromComponent(reviewElem).props.feedbackArray;
      feedbackArray.map((i, index) => {
        mdText =
          i.files.length > 0
            ? mdText +
              `\n${getSectionName(Number(index))}\n` +
              `\n${getFiles(i.files)}\n` +
              i.answer
            : mdText + `\n${getSectionName(Number(index))}\n` + i.answer;
      });

      navigator.clipboard.writeText(`${mdText}`);
    });

    reviewElem.appendChild(button);
    reviewElem.appendChild(style);
  }

  function addButtonInImage(imageBox) {
    if (!imageBox || imageBox.querySelector(`button[${BTN_ATTR}]`)) return;
    imageBox.style.position = "relative";

    const button = document.createElement("button");
    button.setAttribute(BTN_ATTR, "1");

    const style = document.createElement("style");
    style.innerHTML = `
            .ciamd-button-image {
            position: absolute;
            right: 8px;
            top: 8px;
            width: 32px;
            height: 32px;
            background: transparent;
            border: none;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            fill: #c5c7cb;
            z-index: 20;
            cursor: pointer;
            }

            .ciamd-button-image:hover {
            fill: #e5e7eb;
            }
        `;

    button.classList.add("ciamd-button-image");

    button.innerHTML = `
            <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24">
                <g><rect fill="none" height="24" width="24"></rect></g>
                <g><path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"></path></g>
            </svg>
        `[("pointerdown", "mousedown", "click")].forEach((type) => {
      button.addEventListener(
        type,
        (e) => {
          e.stopImmediatePropagation();
          e.preventDefault();

          const img = imageBox.querySelector("img");
          const src = img?.src;
          if (!src) return;
          navigator.clipboard.writeText(`![](${src})`);
        },
        true,
      );
    });
    imageBox.appendChild(button);
    imageBox.appendChild(style);
  }

  addButtonInReview(document.querySelector(REVIEW_WRAPPER_SELECTOR));
  document.querySelectorAll(IMAGE_WRAPPER_SELECTOR).forEach(addButtonInImage);
  console.log(document.querySelectorAll(IMAGE_WRAPPER_SELECTOR));

  const obs = new MutationObserver(() => {
    addButtonInReview(document.querySelector(REVIEW_WRAPPER_SELECTOR));
    document.querySelectorAll(IMAGE_WRAPPER_SELECTOR).forEach(addButtonInImage);
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
