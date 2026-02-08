// ==UserScript==
// @name         Copy-review-as-markdown by ai36
// @namespace    http://tampermonkey.net/
// @version      2026-02-06
// @description  The script adds a “Copy to clipboard” button to elements on the code review page and allows you to quickly copy the required text (URL, value, or block content) to the clipboard with a single click.
// @author       Andrei Fedorov, Artem Stralenia
// @match        https://preax.ru/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  const REVIEW_LIST_SELECTOR = "[id^='feedback-']";
  const ACCORDION_BUTTON_SELECTOR = "button[class^='Accordion_button']";
  const PROJECT_TASK_STATUS = "[class^='ProjectTask_status']";
  const BTN_ATTR = "data-copy-md-btn";

  const SECTION_HEADERS = ["Плюсы", "Баги", "Рекомендации"];
  const SECTION_HEADERS_PREFIX = "###";
  const SCORE_PREFIX = "##";
  const ITERATION_PREFIX = "#";

  const ICONS = {
    COPY: `
        <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <g><rect fill="none" height="24" width="24"></rect></g>
            <g><path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"></path></g>
        </svg>
        `,
    DONE: `
        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50%" cy="50%" r="40%" fill="white"></circle>
            <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"></path>
        </svg>
        `,
    CLOSE: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
            <path d="M310.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L160 210.7 54.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L114.7 256 9.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 301.3 265.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L205.3 256 310.6 150.6z"></path>
        </svg>
        `,
  };

  const TEXTS = {
    NOTICE: "Скопировано",
    AVERAGE_SCORE: "Средняя оценка",
  };

  const NOTICE_TIMEOUT = 5000;

  // React fiber
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

  // Iteration's header
  function getIterationHeader(iteration) {
    if (iteration === "0") return "task-done";

    return `debugging-${iteration}-done`;
  }

  // Average score of iteration
  function getIterationScore(iteration) {
    return getPropsFromComponent(document.querySelector(PROJECT_TASK_STATUS))
      .props.feedback[iteration].required.averageRating;
  }

  // Headers of section in md
  function getSectionName(index) {
    return `${SECTION_HEADERS_PREFIX} ${SECTION_HEADERS[index] || ""}`;
  }

  // Adding attached images
  function getFiles(filesArray) {
    return filesArray.reduce((acc, cur) => acc + `![](${cur})\n`, "");
  }

  // Create a full feedback for one iteration
  function createMdFeedback(feedbackArray) {
    let mdText = "";
    feedbackArray.map((i, index) => {
      mdText =
        i.files.length > 0
          ? mdText +
            `\n\n${getSectionName(Number(index))}\n\n` +
            `${getFiles(i.files)}\n` +
            i.answer +
            "\n"
          : mdText +
            `\n\n${getSectionName(Number(index))}\n\n` +
            i.answer +
            "\n";
    });
    return `${mdText}`;
  }

  // Adding DOM-elements
  function scoreToStar(score) {
    return "⭐⭐⭐⭐⭐".slice(0, score);
  }

  function addButtonInFeedbackList(feedbackItem) {
    if (!feedbackItem || feedbackItem.querySelector(`button[${BTN_ATTR}]`))
      return;

    feedbackItem.style.position = "relative";

    const button = document.createElement("button");
    button.setAttribute(BTN_ATTR, "1");
    button.setAttribute("type", "button");

    const style = document.createElement("style");
    style.innerHTML = `
        .cramd-button-review {
            position: absolute;
            right: 0px;
            top: -.25rem;

            width: fit-content;
            height: auto;

            color: rgb(161 161 170/var(--tw-text-opacity,1));
            background-color: rgb(63 63 70/.5);
            fill: currentColor;

            border: none;
            border-radius:.25rem;

            padding: calc(.5rem - .125rem);

            display: flex;
            align-items: center;
            justify-content: center;
            fill: #c5c7cb;
            z-index: 20;
            cursor: pointer;

            transition-property: background-color,border-color,box-shadow,color;
            transition-duration: .2s;

            @media (width < 768px) {
                padding: calc(.5rem - .125rem);
            }

            &:hover {
                background-color: rgb(250 250 250/var(--tw-bg-opacity,1));
                color: rgb(24 24 27/var(--tw-text-opacity,1));
            }

            svg {
                width: 1.25rem;
                height: 1.25rem;
                fill: currentColor;

                @media (width < 768px) {
                    height: 1rem;
                    width: 1rem;
                }
            }
        }
        `;

    button.classList.add("cramd-button-review");

    button.innerHTML = ICONS.COPY;

    button.addEventListener("click", (e) => {
      const iteration = Number(feedbackItem.id.match(/\d+$/)[0]) - 1;
      const iterationScore = getIterationScore(iteration);

      let fullFeedback = `${ITERATION_PREFIX} ${getIterationHeader(iteration)} (${TEXTS.AVERAGE_SCORE}: ${iterationScore})\n\n`;

      const componentsList = feedbackItem.querySelectorAll(
        ACCORDION_BUTTON_SELECTOR,
      );

      componentsList.forEach((c) => {
        const props = getPropsFromComponent(c).props;
        const feedbackArray = props.accordionContent.props.feedbackArray;
        const feedbackHeading = `${SCORE_PREFIX} ${props.title} (${props.heading}) ${scoreToStar(props.chipContent)}`;
        const mdFeedback = createMdFeedback(feedbackArray);
        fullFeedback =
          fullFeedback +
          feedbackHeading +
          mdFeedback +
          "\n\n\n\n\n\n\n\n\n\n<br><br>\n\n";
      });
      navigator.clipboard.writeText(`${fullFeedback}`);
      addMessage();
    });

    feedbackItem.appendChild(button);
    feedbackItem.appendChild(style);
  }

  function addMessage() {
    const messageBox = document.createElement("div");
    messageBox.classList.add("crimd-notice");
    messageBox.innerHTML = `
        <div>${ICONS.DONE}</div>
        <span>${TEXTS.NOTICE}</span>
        <button type="button">${ICONS.CLOSE}</button>
    `;

    const style = document.createElement("style");
    style.innerHTML = `
        .crimd-notice {
            user-select: none;

            font-size: 1.25rem;
            line-height: 1.75rem;

            position: fixed;
            right: 2rem;
            bottom: 2rem;

            box-sizing: border-box;
            border: 2px solid rgb(147 51 234/var(--tw-border-opacity,1));
            border-radius: .25rem;

            width: fit-content;
            height: auto;

            background-color: rgb(24 24 27/var(--tw-bg-opacity,1));

            display: grid;
            grid-template-columns: auto minmax(0,1fr) auto;
            align-items: center;

            z-index: 70;

            animation: cramd ${NOTICE_TIMEOUT}ms forwards;

            @media (width < 1024px) {
                right: 1.5rem;
                bottom: 1.5rem;
            }

            @media (width < 768px) {
                right: 1rem;
                bottom: 1rem;
            }

            div {
                padding: 1rem;
                display: grid;
                align-items: center;

                @media (width < 1024px) {
                    padding: .75rem;
                }

                @media (width < 768px) {
                    padding: .5rem;
                }

                svg {
                    display: block;
                    fill: #9333ea;
                    height: 1.25rem;
                    width: 1.25rem;

                    @media (width < 768px) {
                        height: 1rem;
                        width: 1rem;
                    }
                }
            }

            span {
                font-family: Montserrat;
                font-weight: 500;
                font-size: .875rem;
                line-height: 1.25rem;
                color: rgb(216 180 254/var(--tw-text-opacity,1));

                @media (width < 768px) {
                    font-size: .75rem;
                    line-height: 1rem;
                }
            }

            button {
                cursor: pointer;
                border: none;
                border-radius: .25rem;

                padding: 1rem;

                background-color: transparent;

                display: flex;
                color: inherit;
                font: inherit;

                @media (width < 1024px) {
                    padding: .75rem;
                }

                @media (width < 768px) {
                    padding: .5rem;
                }

                svg {
                    display: block;
                    width: 1rem;
                    height: 1rem;
                    fill: #9333ea;

                    @media (width < 768px) {
                        height: .75rem;
                        width: .75rem;
                    }
                }
            }


        }

        @keyframes cramd {
            from {
                translate: 0 100%;
                opacity: 0;
            }
            4% {
                translate: 0 0;
                opacity: 1;
            }
            96% {
                translate: 0 0;
                opacity: 1;
            }
            to {
                translate: calc(100% + 2rem) 0;
                opacity: 0;
            }
        }

    `;

    document.body.appendChild(messageBox);
    document.body.appendChild(style);

    function timer() {
      setTimeout(() => {
        deleteMessage(messageBox);
        deleteMessage(style);
      }, NOTICE_TIMEOUT);
    }
    timer();

    const closeButton = messageBox.querySelector("button");
    if (closeButton) {
      closeButton.addEventListener(
        "click",
        () => {
          deleteMessage(messageBox);
          deleteMessage(style);
        },
        { once: true },
      );
    }
  }

  function deleteMessage(node) {
    node.remove();
  }

  document
    .querySelectorAll(REVIEW_LIST_SELECTOR)
    .forEach(addButtonInFeedbackList);

  const obs = new MutationObserver(() => {
    document
      .querySelectorAll(REVIEW_LIST_SELECTOR)
      .forEach(addButtonInFeedbackList);
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
