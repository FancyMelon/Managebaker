//第一次安装
chrome.runtime.onInstalled.addListener(function () {
  localforage.getItem("config").then(function (value) {
    if (value.agree == 0) {
      var action_url = chrome.runtime.getURL("lib") + "/1st_run/index.html";
      chrome.tabs.create({
        url: action_url
      });
    } else if (!value.domain && typeof (value.domain) != "undefined" && value.domain != 0) {
      var action_url = chrome.runtime.getURL("managebaker/options.html");
      chrome.tabs.create({
        url: action_url
      });
    }
  }).catch(function (err) {
    // 当出错时，此处代码运行
    jsonObj = {
      agree: 0,
      domain: "",
      subdomain: "",
      root: ""
    }
    localforage.setItem("config", jsonObj);
    var action_url = chrome.runtime.getURL("lib") + "/1st_run/index.html";
    chrome.tabs.create({
      url: action_url
    });
  });


});

var tabid

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  switch (request.status) {
    case "on":
      {
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
          tabid = tabId;
          var url = tab.url;
          var patt = new RegExp("managebac");
          if (patt.test(url)) {
            //判断tab的标题是否有竖线， MB domcontent 从 url 到title
            if (tab.status == "complete" && tab.title.indexOf("|") != -1) {
              var patt1 = new RegExp("student/?$"); //dashboard
              var patt2 = new RegExp("student/classes/[0-9]+/assignments"); //assignments
              if (patt1.test(url)) {
                //dashboard
                //send dashboard to managebaker.js
                //eventHandler("1");
                chrome.tabs.sendMessage(tabId, {
                  type: "dashboard"
                });
              } else if (patt2.test(url)) {
                //assignments
                //send assignment to managebaker.js
                chrome.tabs.sendMessage(tabId, {
                  type: "assignment"
                });
              } else {
                chrome.tabs.sendMessage(tabId, {
                  type: "other"
                });
              }
            }
          }
        });
      }
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  switch (request.method) {
    case "get":
      {
        var event_completed = new Array();
        var event = request.event_id;
        var length = event.length
        for (var i = 0; i < length; i++) {
          (function (i) {
            var id = request.event_id[i];
            localforage.getItem(id).then(function (value) {
              if (value.complete == 1) {
                event_completed.push(id);
              }
              var end = length - 1;
              if (i == end) {
                chrome.tabs.sendMessage(tabid, {
                  "event_id": event_completed,
                  "type": "set_complete"
                });
              }
            })
          })(i);
        }
        break;
      }
    case "change_complete_status":
      {
        var event_id = request.event_id;
        localforage.getItem(event_id).then(function (value) {
          if (value.complete == 1) {
            var jsonObj = value;
            jsonObj["complete"] = 0;
            localforage.setItem(event_id, jsonObj);
          } else if (value.complete == 0) {
            var jsonObj = value;
            jsonObj["complete"] = 1;
            localforage.setItem(event_id, jsonObj);
          }
        })
      }
      break;
  }
});

function eventHandler(modeBool) {
  var startDate = new Date();
  var endDate = new Date();
  //long query
  if (modeBool == "1") {
    startDate.Add(-1, "y");
    endDate.Add(1, "y");
    //short query
  } else {
    startDate.Add(-1, "M");
    endDate.Add(1, "M");
  }
  endDate.Add(-1, "d");
  var url = "https://qibaodwight.managebac.cn/student/events.json";
  var dateData = {
    start: startDate.Format("yyyy-MM-dd"),
    end: endDate.Format("yyyy-MM-dd")
  };
  try {
    $.get(
      url,
      dateData,
      function (result, status) {
        result.forEach(event => {
          if (typeof event.id != "number") {
            return;
          }
          var event_data = {
            title: event.title,
            start: event.start,
            url: event.url,
            complete: "1",
            category: "",
            score: {
              get: 0,
              total: 0
            }
          };
          localforage.setItem(String(event.id), event_data).then(function (value) {});
        });
        return 1;
      },
      "json"
    );
  } catch {
    throw "queryError";
  }
}