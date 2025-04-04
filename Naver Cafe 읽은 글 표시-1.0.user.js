// ==UserScript==
// @name         Naver Cafe 읽은 글 표시
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  iframe 기반 게시판 + 기본 구조 게시판 모두 지원
// @match        https://cafe.naver.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function extractClubId() {
      try {
          const params = new URLSearchParams(location.search);

          // ✅ iframe 내부에서 바로 clubid 들어있음
          const clubIdFromSearch = params.get('search.clubid') || params.get('clubid');
          if (clubIdFromSearch) return clubIdFromSearch;

          // ✅ iframe_url (부모 페이지에서 실행될 경우 대비)
          const iframeUrl = params.get('iframe_url') || params.get('iframe_url_utf8');
          if (iframeUrl) {
              const decoded = decodeURIComponent(iframeUrl);
              const queryString = decoded.split('?')[1];
              if (queryString) {
                  const innerParams = new URLSearchParams(queryString);
                  const innerClubId = innerParams.get('search.clubid') || innerParams.get('clubid');
                  if (innerClubId) return innerClubId;
              }
          }

          // ✅ 신형 구조: /cafes/{clubid}/...
          const parts = location.pathname.split('/');
          const cafeIdx = parts.indexOf('cafes');
          if (cafeIdx !== -1 && parts.length > cafeIdx + 1) {
              return parts[cafeIdx + 1];
          }

          return 'default';
      } catch (e) {
          console.warn('[TM] clubid 추출 실패:', e);
          return 'default';
      }
  }


  const STORAGE_KEY = `readArticleLinks::${extractClubId()}`;
  const isIframe = window.top !== window.self;

  function getStoredLinks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveLink(url) {
      console.log('[TM] clubid:', extractClubId());
      console.log('[TM] STORAGE_KEY:', STORAGE_KEY);
    const links = getStoredLinks();
    if (!links.includes(url)) {
      links.push(url);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
      console.log('[TM] 저장된 링크:', url);
    }
  }

  function extractTrueUrl(href) {
    if (href.includes('https://cc.naver.com')) {
      const u = new URL(href).searchParams.get('u');
      return decodeURIComponent(u);
    }
    return href;
  }

  function extractArticleIdFromUrl(href) {
    try {
      const url = new URL(href);
      const params = new URLSearchParams(url.search);
      if (params.has('articleid')) return params.get('articleid');

      const iframeUrl = params.get('iframe_url') || params.get('iframe_url_utf8');
      if (iframeUrl) {
        let decoded = decodeURIComponent(iframeUrl);
        if (decoded.includes('%')) decoded = decodeURIComponent(decoded);
        const innerParams = new URLSearchParams(decoded.split('?')[1]);
        return innerParams.get('articleid');
      }

      const match = url.pathname.match(/\/articles\/(\d+)/);
      if (match) return match[1];
    } catch (e) {
      return null;
    }
    return null;
  }

  function markReadArticles() {
  const storedLinks = getStoredLinks();
  const storedIds = storedLinks.map(extractArticleIdFromUrl).filter(Boolean);
  const hideMode = localStorage.getItem(`${STORAGE_KEY}::hide`) === 'true';

  const articleLinks = document.querySelectorAll(
    'a[href*="ArticleRead.nhn"], a[href*="/article/read"], a[href*="/articles/"]'
  );

  articleLinks.forEach(a => {

    const realHref = extractTrueUrl(a.href);
    const currentId = extractArticleIdFromUrl(realHref);
    const container = a.closest('tr') || a.closest('li') || a.closest('div');
    if (!container) return;

    if (currentId && storedIds.includes(currentId)) {
      if (hideMode) {
        container.style.display = 'none'; // 숨기기 모드
        container.style.backgroundColor = '';
      } else {
        container.style.display = '';
        container.style.backgroundColor = '#d3d3d3';
      }
    } else {
      container.style.display = ''; // 안읽은 글은 항상 보이게
      container.style.backgroundColor = '';
    }
  });
}


  function setupClickListener() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const real = extractTrueUrl(a.href);
      if (real.includes('ArticleRead.nhn') || real.includes('/article/read') || real.includes('/articles/')) {
        saveLink(real);
      }
    });
  }
   function createClearButton() {
  const btn = document.createElement('button');
  btn.textContent = '📄 읽은 글 초기화';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '9999';
  btn.style.padding = '8px 12px';
  btn.style.backgroundColor = '#444';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '8px';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '14px';
  btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  btn.style.opacity = '0.8';

  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.8'; });

  btn.addEventListener('click', () => {
    const confirmed = confirm('정말로 읽은 글 기록을 초기화하시겠습니까?');
    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    console.log(`[TM] '${STORAGE_KEY}' 초기화 완료`);
    alert('✅ 읽은 글 기록이 초기화되었습니다.');
    location.reload();
  });

  document.body.appendChild(btn);
}

    function createToggleHideButton(STORAGE_KEY, markReadArticles) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.bottom = '60px';
  wrapper.style.right = '20px';
  wrapper.style.zIndex = '2147483647';
  wrapper.style.background = '#f8f8f8';
  wrapper.style.padding = '8px 12px';
  wrapper.style.border = '1px solid #ccc';
  wrapper.style.borderRadius = '8px';
  wrapper.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
  wrapper.style.fontSize = '13px';
  wrapper.style.color = '#222';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'tm-hide-read';
  checkbox.style.marginRight = '5px';

  const label = document.createElement('label');
  label.htmlFor = 'tm-hide-read';
  label.textContent = '읽은 글 숨기기';

  const saved = localStorage.getItem(`${STORAGE_KEY}::hide`);
  if (saved === 'true') {
    checkbox.checked = true;
  }

  checkbox.addEventListener('change', () => {
    localStorage.setItem(`${STORAGE_KEY}::hide`, checkbox.checked ? 'true' : 'false');
    markReadArticles(); // 상태 변경 시 바로 적용
  });

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  document.body.appendChild(wrapper);
}


function removeHighlights() {
  const links = document.querySelectorAll('a[href*="ArticleRead.nhn"], a[href*="/article/read"], a[href*="/articles/"]');
  links.forEach(a => {
    const target = a.closest('tr') || a.closest('li') || a.closest('div');
    if (target) {
      target.style.backgroundColor = ''; // 초기화
    }
  });
}

  function hideAdIframe() {
  const adIframe = document.querySelector('iframe#cafe_sdk_tgtLREC');
  if (adIframe) {
    adIframe.style.display = 'none';
    console.log('[TM] 광고 iframe 숨김 완료');
  }
}

    function hidePowerAdInIframe() {
  const iframe = document.querySelector('iframe#cafe_main');
  if (!iframe) return;

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return;

    const adDivs = iframeDoc.querySelectorAll('div.power_ad');
    adDivs.forEach(div => {
      div.style.display = 'none';
    });
  } catch (e) {
    console.warn('[TM] iframe 접근 실패:', e);
  }
}

  function runSharedScript() {
    setupClickListener();

    const observer = new MutationObserver(() => {
        markReadArticles();
        hideAdIframe(); // ✅ 광고 숨기기
        hidePowerAdInIframe(); // ✅ iframe 내부 power_ad 제거
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(markReadArticles, 1000);
    window.addEventListener('load', markReadArticles);
    markReadArticles();

    // ✅ 버튼은 최상위 창(메인 window)에서만 생성
  if (window.top === window.self) {
    createClearButton();
    createToggleHideButton(STORAGE_KEY, markReadArticles);
  }
    console.log('[TM] 읽은 글 회색 표시 스크립트 실행됨');
  }

let repeatCount = 0;
const maxRepeats = 5;

const intervalId = setInterval(() => {
  hidePowerAdInIframe();

  repeatCount++;
  if (repeatCount >= maxRepeats) {
    clearInterval(intervalId);
    console.log('[TM] 반복 체크 종료 (5회)');
  }
}, 1000);

      runSharedScript();
})();
