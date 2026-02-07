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
    'use strict'
    const REVIEW_WRAPPER_SELECTOR = "section[class^='FormatFeedback_answerSection']"
    const IMAGE_WRAPPER_SELECTOR = "[class^='ProjectTask_feedbackList']"
    const REVIEW_LIST_SELECTOR = "[id^='feedback-']"
    const ACCORDION_BUTTON_SELECTOR = "button[class^='Accordion_button']"
    const BTN_ATTR = 'data-copy-md-btn'

    function getReactFiber(dom) {
        for (const key in dom) {
            if (key.startsWith('__reactFiber$')) {
                return dom[key]
            }
        }
        return null
    }

    function findComponentFiber(fiber) {
        let current = fiber

        while (current) {
            if (typeof current.type === 'function') {
                return current
            }
            current = current.return
        }

        return null
    }

    function getPropsFromComponent(component) {
        const fiber = getReactFiber(component)
        if (!fiber) return null

        const componentFiber = findComponentFiber(fiber)
        if (!componentFiber) return null

        return {
            name: componentFiber.type.name || 'Anonymous',
            props: componentFiber.memoizedProps,
        }
    }

    function getSectionName(index) {
        switch (index) {
            case 0:
                return '# Плюсы'
            case 1:
                return '# Баги'
            case 2:
                return '# Рекомендации'
            default:
                return '# Оник облажался(('
        }
    }

    function getFiles(filesArray) {
        return filesArray.reduce((acc, cur) => acc + `![](${cur})\n`, '')
    }

    function createMdFeedback(feedbackArray) {
        let mdText = ''
        feedbackArray.map((i, index) => {
            mdText =
                i.files.length > 0
                    ? mdText +
                      `\n${getSectionName(Number(index))}\n` +
                      `\n${getFiles(i.files)}\n` +
                      i.answer
                    : mdText + `\n${getSectionName(Number(index))}\n` + i.answer
        })
        return mdText
    }

    function addButtonInReview(reviewElem) {
        if (!reviewElem || reviewElem.querySelector(`button[${BTN_ATTR}]`)) return

        reviewElem.style.position = 'relative'

        const button = document.createElement('button')
        button.setAttribute(BTN_ATTR, '1')

        const style = document.createElement('style')
        style.innerHTML = `
        .cramd-button-review {
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

            &:hover {
                fill: #e5e7eb;
            }
        }
        `

        button.classList.add('cramd-button-review')

        button.innerHTML = `
        <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24">
            <g><rect fill="none" height="24" width="24"></rect></g>
            <g><path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"></path></g>
        </svg>
    `

        button.addEventListener('click', e => {
            const feedbackArray = getPropsFromComponent(reviewElem).props.feedbackArray

            navigator.clipboard.writeText(`${createMdFeedback(feedbackArray)}`)
            addMessage()
        })

        reviewElem.appendChild(button)
        reviewElem.appendChild(style)
    }

    function addButtonInFeedbackList(feedbackItem) {
        if (!feedbackItem || feedbackItem.querySelector(`button[${BTN_ATTR}]`)) return

        feedbackItem.style.position = 'relative'

        const button = document.createElement('button')
        button.setAttribute(BTN_ATTR, '1')

        const style = document.createElement('style')
        style.innerHTML = `
        .cramd-button-review {
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

            &:hover {
                fill: #e5e7eb;
            }
        }
        `

        button.classList.add('cramd-button-review')

        button.innerHTML = `
        <svg enable-background="new 0 0 24 24" focusable="false" height="24" viewBox="0 0 24 24" width="24">
            <g><rect fill="none" height="24" width="24"></rect></g>
            <g><path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"></path></g>
        </svg>
    `

        button.addEventListener('click', e => {
            let fullFeedback = ''
            const componentsList = feedbackItem.querySelectorAll(ACCORDION_BUTTON_SELECTOR)

            componentsList.forEach(c => {
                const props = getPropsFromComponent(c).props
                const feedbackArray = props.accordionContent.props.feedbackArray
                const feedbackHeading = `# ${props.heading} Оценка:${props.chipContent}`
                const mdFeedback = createMdFeedback(feedbackArray)
                fullFeedback = fullFeedback + '\n' + feedbackHeading + '\n' + mdFeedback
            })
            navigator.clipboard.writeText(`${fullFeedback}`)
            addMessage()
        })

        feedbackItem.appendChild(button)
        feedbackItem.appendChild(style)
    }

    function addMessage() {
        const messageBox = document.createElement('div')
        messageBox.classList.add('crimd-notice')
        messageBox.innerHTML = `
        <svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m11.998 2.005c5.517 0 9.997 4.48 9.997 9.997 0 5.518-4.48 9.998-9.997 9.998-5.518 0-9.998-4.48-9.998-9.998 0-5.517 4.48-9.997 9.998-9.997zm-5.049 10.386 3.851 3.43c.142.128.321.19.499.19.202 0 .405-.081.552-.242l5.953-6.509c.131-.143.196-.323.196-.502 0-.41-.331-.747-.748-.747-.204 0-.405.082-.554.243l-5.453 5.962-3.298-2.938c-.144-.127-.321-.19-.499-.19-.415 0-.748.335-.748.746 0 .205.084.409.249.557z" fill-rule="nonzero"/></svg>
        <span>Скопировано</span>
        <button type="button">
            <svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="m12 10.93 5.719-5.72c.146-.146.339-.219.531-.219.404 0 .75.324.75.749 0 .193-.073.385-.219.532l-5.72 5.719 5.719 5.719c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.385-.073-.531-.219l-5.719-5.719-5.719 5.719c-.146.146-.339.219-.531.219-.401 0-.75-.323-.75-.75 0-.192.073-.384.22-.531l5.719-5.719-5.72-5.719c-.146-.147-.219-.339-.219-.532 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" />
            </svg>
        </button>
    `

        const style = document.createElement('style')
        style.innerHTML = `
        .crimd-notice {
            font-size: 16px;
            line-height:24px;
            box-sizing: border-box;
            position: fixed;
            right: 52px;
            bottom: 52px;
            background: transparent;
            border: 2px solid;
            padding: 16px;
            border-radius: 4px;
            background: #181818;

            display: flex;
            align-items: center;
            justify-content: center;
            color: #16a34a;
            gap: 5px;
            z-index: 20;

            animation: cramd 3s forwards;

            button {
                cursor: pointer;
                border: none;
                padding: 0;
                background: unset;
                width: 24px;
                height: 24px;
                display: flex;
                color: inherit;

                svg {
                    margin: auto;
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                }
            }

            svg {
                width: 24px;
                height: 24px;
                fill: currentColor;
            }

            span {
                font-weight: 600;
                color: color-mix(in srgb, #16a34a 50%, white);
            }
        }

        @keyframes cramd {
            from {
                translate: 150% 0;
            }
            10% {
                translate: 0 0;
                opacity: 1;
            }
            90% {
                translate: 0 0;
                opacity: 1;
            }
            to {
                translate: 0 -100%;
                opacity: 0;
            }
        }
    `

        document.body.appendChild(messageBox)
        document.body.appendChild(style)

        function timer() {
            setTimeout(() => {
                deleteMessage(messageBox)
                deleteMessage(style)
            }, 3000)
        }
        timer()

        const closeButton = messageBox.querySelector('button')
        if (closeButton) {
            closeButton.addEventListener(
                'click',
                () => {
                    deleteMessage(messageBox)
                    deleteMessage(style)
                },
                { once: true }
            )
        }
    }

    function deleteMessage(node) {
        node.remove()
    }

    addButtonInReview(document.querySelector(REVIEW_WRAPPER_SELECTOR))
    document.querySelectorAll(REVIEW_LIST_SELECTOR).forEach(addButtonInFeedbackList)

    const obs = new MutationObserver(() => {
        addButtonInReview(document.querySelector(REVIEW_WRAPPER_SELECTOR))
        document.querySelectorAll(REVIEW_LIST_SELECTOR).forEach(addButtonInFeedbackList)
    })

    obs.observe(document.documentElement, { childList: true, subtree: true })
})()
