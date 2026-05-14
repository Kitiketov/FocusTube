(function () {
  "use strict";

  const SUPPORT_WIDGET_URL = "https://yoomoney.ru/quickpay/fundraise/button?billNumber=1HO196UTMDJ.260513&";
  const SUPPORT_CONFIRM_URL = "https://yoomoney.ru/quickpay/fundraise/confirm";

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "ytsho:open-support") {
      return false;
    }

    openYooMoneyPayment()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));

    return true;
  });

  async function openYooMoneyPayment() {
    const paymentUrl = await createYooMoneyPaymentUrl();
    await chrome.tabs.create({ url: paymentUrl, active: true });
  }

  async function createYooMoneyPaymentUrl() {
    const widgetResponse = await fetch(SUPPORT_WIDGET_URL, { credentials: "omit" });
    const widgetHtml = await widgetResponse.text();
    const token = widgetHtml.match(/window\.__secretKey__="([^"]+)"/)?.[1];
    const dataRaw = widgetHtml.match(/window\.__data__=(.*?);window\.__urls__/s)?.[1];
    if (!widgetResponse.ok || !token || !dataRaw) {
      throw new Error("YooMoney widget data was not found");
    }

    const formParams = JSON.parse(dataRaw).preloadedState.formParams;
    const confirmResponse = await fetch(SUPPORT_CONFIRM_URL, {
      method: "POST",
      credentials: "omit",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "x-csrf-token": token
      },
      body: JSON.stringify(formParams)
    });
    const paymentUrl = (await confirmResponse.text()).trim();
    if (!confirmResponse.ok || !paymentUrl.startsWith("https://yoomoney.ru/transfer/quickpay?requestId=")) {
      throw new Error("YooMoney payment URL was not created");
    }
    return paymentUrl;
  }
})();
