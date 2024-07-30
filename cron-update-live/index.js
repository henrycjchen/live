const { simpleGit, CleanOptions } = require("simple-git");
const request = require("superagent");
const fs = require("fs");
const { CronJob } = require("cron");

const template1 = `#EXTINF:-1 tvg-name="揭阳综合" tvg-logo="https://oss.jyrtv.tv/2022/4/30/c0885431-f636-79df-3340-0597b6424700.jpg" group-title="揭阳频道",揭阳综合
https://hls-stjy.sobeylive.com/stjy2020/zhpd.m3u8?{params}
`;
const template2 = `#EXTINF:-1 tvg-name="揭阳生活" tvg-logo="https://oss.jyrtv.tv/2022/7/1/cc56a12d-d02a-b305-8e71-9a60a937ad85.jpg" group-title="揭阳频道",揭阳生活
https://hls-stjy.sobeylive.com/stjy2020/ggpd.m3u8?{params}
`;
const shantou = `#EXTINF:-1 tvg-name="汕头综合" tvg-logo="" group-title="揭阳频道",汕头综合
https://sttv-hls.strtv.cn/lKGXIQa/500/51sljG0.m3u8
`;

const job = new CronJob(
  "0 0 */1 * * *", // cronTime
  function () {
    main();
  }, // onTick
  null, // onComplete
  true, // start
  "America/Los_Angeles", // timeZone
  null,
  true
);

async function main() {
  try {
    const ipv6 = fs.readFileSync("../tv/m3u/ipv6.m3u", "utf-8");
    const [result1, result2] = await Promise.all([
      fetchData("11", template1),
      fetchData("12", template2),
    ]);
    fs.writeFileSync("../tv/m3u/customIPV6.m3u", ipv6 + result1 + result2);
    await git();
    console.log("done", new Date().toLocaleString());
  } catch (e) {
    console.error(e);
  }
}

async function fetchData(tvId, template) {
  const {
    _body: {
      data: { m3u8 },
    },
  } = await request
    .get(`https://ap.jyrtv.tv/tvradio/Tvfront/getTvInfo?loop=1&tv_id=${tvId}`)
    .timeout(3000);
  const params = m3u8.split("?")[1];
  return template.replace("{params}", params);
}

async function git() {
  const { modified } = await simpleGit().status();
  if (modified) {
    await simpleGit().add("../*").commit("update");
  }

  const { behind, ahead } = await simpleGit()
    .pull("upstream", "main", ["--rebase"])
    .status();
  if (behind || ahead) {
    await simpleGit().push(["--force"]);
    console.log("updated");
  } else {
    console.log("no change");
  }
}
