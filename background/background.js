if (chrome) {
  chrome.runtime.onMessage.addListener(notify);
}else {
  browser.runtime.onMessage.addListener(notify);
}

function createReadableVersion(dom) {
  var reader = new Readability(dom);
  var article = reader.parse();
  return article;
}

function convertArticleToMarkdown(article, formattedDate, sourceUrl) {
  var turndownService = new TurndownService()
  var markdown = turndownService.turndown(article.content);
  
  //add article titel as header
  markdown = "---\ntitle: \"" + article.title + "\"\ndate: " + formattedDate + "\ntags: [\"\"]\n---\n\n[source](" + sourceUrl + ")\n\n" + markdown;

  //add summary if exist
  /* if (article.excerpt != null) {
   *   markdown = "> " + article.excerpt + "\n\n" + markdown;
   * } */
  return markdown;
}

function generateValidFileName(title) {
  //remove < > : " / \ | ? * 
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name =  title.replace(illegalRe, "");
  return name;
}

function downloadMarkdown(markdown, article) {
  var blob = new Blob([markdown], {
    type: "text/markdown;charset=utf-8"
  });
  var url = URL.createObjectURL(blob);
  if (chrome) {
    chrome.downloads.download({
      url: url,
      filename: generateValidFileName(article.title) + ".md",
      saveAs: true
    }, function(id) {
      chrome.downloads.onChanged.addListener((delta ) => {
        //release the url for the blob
        if (delta.state && delta.state.current == "complete") {
          if (delta.id === id) {
            window.URL.revokeObjectURL(url);
          }
        }
      });
    });
  }else {
    browser.downloads.download({
      url: url,
      filename: generateValidFileName(article.title) + ".md",
      incognito: true,
      saveAs: true
    }).then((id) => {
      browser.downloads.onChanged.addListener((delta ) => {
        //release the url for the blob
        if (delta.state && delta.state.current == "complete") {
          if (delta.id === id) {
            window.URL.revokeObjectURL(url);
          }
        }
      });
    }).catch((err) => {
      console.error("Download failed" + err)
    });
  }
}


//function that handles messages from the injected script into the site
function notify(message, sender) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day}`;
  
  var parser = new DOMParser();
  var dom = parser.parseFromString(message.dom, "text/html");
  if (dom.documentElement.nodeName == "parsererror"){
    console.error( "error while parsing");
  } 

  var article = createReadableVersion(dom);
  var sourceUrl = sender.tab.url;
  var markdown = convertArticleToMarkdown(article, formattedDate, sourceUrl);
  downloadMarkdown(markdown, article);
}
