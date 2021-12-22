const puppeteer = require("puppeteer");
const fs = require("fs");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const salpacoJson = require("./salpaco.json");
(async () => {
  const doc = new GoogleSpreadsheet("YOUR_SPREADSHEET_ID");
  await doc.useServiceAccountAuth("YOUR_CREDENTIALS_FILE");
  await doc.loadInfo();
  await doc.updateProperties({ title: "Salpaco" });
  // create a browser instance
  const browser = await puppeteer.launch({
    headless: false,
  });
  // create a page inside the browser
  const page = await browser.newPage();
  // go to the website
  await page.goto("https://salpaco.com/company/");

  // This Line Is For Scrapping All Links From The Website

  //   const x = await page.$$eval("#after_submenu_1 div.flex_column p a", (el) =>
  //     el.map((a) => a.getAttribute("href"))
  //   );
  //   fs.writeFileSync("./salpaco.json", JSON.stringify(x));

  const GetType = function (key) {
    switch (key) {
      case 1:
        return "مصاحبه";
      case 2:
        return "تجربه";
      default:
        break;
    }
  };
  // take a screenshot and save it in the present folder
  for (let index = 0; index < salpacoJson.length; index++) {
    const element = salpacoJson[index];
    await page.goto(element);
    await page.waitForTimeout(2000);
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          var scrollTop = -1;
          const interval = setInterval(() => {
            window.scrollBy(0, 100);
            if (document.documentElement.scrollTop !== scrollTop) {
              scrollTop = document.documentElement.scrollTop;
              return;
            }
            clearInterval(interval);
            resolve();
          }, 10);
        })
    );
    const componyDescription = await page.$$eval(".avia_textblock p", (el) =>
      el.map((e) => e.innerText)
    );
    const componyName = await page.$$eval("h1", (el) =>
      el.map((e) => e.innerText)
    );
    const componySite = await page.$$eval(".av-subheading p", (el) =>
      el.map((e) => e.innerText)
    );
    await page.waitForTimeout(5000);
    const sheet = await doc.addSheet({
      headerValues: [
        "componySite",
        "componyName",
        "componyDescription",
        "JobTitle",
        "CreatedAt",
        "Statics",
        "Description",
        "Type",
      ],
      title: componyName[0],
    });
    await sheet.addRow({
      componySite: componySite[0],
      componyName: componyName[0],
      componyDescription: componyDescription[0],
    });
    const tabCount = 2;
    for (let jindex = 1; jindex <= tabCount; jindex++) {
      await page.$$eval(`a[href="#av-tab-section-1-${jindex}"]`, (el) =>
        el.map((e) => e.click())
      );
      await page.waitForTimeout(10000);
      await page.$$eval(".ppsPopupClose_while_close", (el) =>
        el.map((e) => e.click())
      );
      await page.waitForTimeout(2000);
      await page.screenshot({
        fullPage: true,
        path: `Images/${componyName}-${GetType(jindex)}.png`,
      });
      let pages;
      if (jindex === 1) {
        pages = await page.$$(`#av-tab-section-1 div.flex_column_div`);
        console.log(pages.length);
      } else {
        pages = await page.$$(`#av_section_2 div.flex_column_div`);
      }
      for (let index = 0; index < pages.length; index++) {
        await page.waitForTimeout(1000);
        console.log("Scraping post: " + index + " of " + pages.length);
        const element = pages[index];
        var JobTitle = await element.$$eval("h2 b", (el) =>
          el.map((e) => e.innerText)
        );
        var CreatedAt = await element.$$eval("h2 spam", (el) =>
          el.map((e) => e.innerText)
        );
        var InterviewStatics = await element.$$eval(
          ".av-subheading.av-subheading_below spam",
          (el) => el.map((e) => e.innerText)
        );
        var InterviewDescription = await element.$$eval(
          ".av_inherit_color  p",
          (el) => el.map((e) => e.innerText)
        );
        if (
          JobTitle.length > 0 &&
          CreatedAt.length > 0 &&
          InterviewDescription.length > 0
        ) {
          await sheet.addRow({
            JobTitle: JobTitle[0],
            CreatedAt: CreatedAt[0],
            Statics: InterviewStatics[0],
            Description: InterviewDescription[0],
            Type: GetType(jindex),
          });
        }
      }
    }
  }
  await browser.close();
})();
