const ENDPOINT = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';

function doBidderSync(type, url, bidder) {
  if (!url) {
    console.log(`No sync url for bidder "${bidder}": ${url}`);
  } else if (type === 'image' || type === 'redirect') {
    console.log(`Invoking image pixel user sync for bidder: "${bidder}"`);
    triggerPixel(url);
  } else if (type == 'iframe') {
    // TODO test iframe solution
  } else {
    console.log(`User sync type "${type}" not supported for bidder: "${bidder}"`);
  }
}

function triggerPixel(url) {
  const img = new Image();
  img.src = url;
}

function process(response) {
  let result = JSON.parse(response);
  if (result.status === 'OK' || result.status === 'no_cookie') {
    if (result.bidder_status) {
      result.bidder_status.forEach(bidder => {
        if (bidder.no_cookie) {
          doBidderSync(bidder.usersync.type, bidder.usersync.url, bidder.bidder);
        }
      });
    }
  }
}

function ajax(url, callback, data, options = {}) {
  try {
    let timeout = 3000;
    let x;
    let method = options.method || (data ? 'POST' : 'GET');

    let callbacks = typeof callback === 'object' ? callback : {
      success: function() {
        console.log('xhr success');
      },
      error: function(e) {
        console.log('xhr error', null, e);
      }
    };

    if (typeof callback === 'function') {
      callbacks.success = callback;
    }

    x = new window.XMLHttpRequest();
    x.onreadystatechange = function () {
      if (x.readyState === 4) {
        let status = x.status;
        if ((status >= 200 && status < 300) || status === 304) {
          callbacks.success(x.responseText, x);
        } else {
          callbacks.error(x.statusText, x);
        }
      }
    };
    x.ontimeout = function () {
      console.log('xhr timeout after ', x.timeout, 'ms');
    };

    if (method === 'GET' && data) {
      let urlInfo = parseURL(url, options);
      Object.assign(urlInfo.search, data);
      url = formatURL(urlInfo);
    }

    x.open(method, url);
    // IE needs timoeut to be set after open - see #1410
    x.timeout = timeout;

    if (options.withCredentials) {
      x.withCredentials = true;
    }
    if (options.preflight) {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
    x.setRequestHeader('Content-Type', options.contentType || 'text/plain');
    
    if (method === 'POST' && data) {
      x.send(data);
    } else {
      x.send();
    }
  } catch (error) {
    console.log('xhr construction', error);
  }
}

// Send empty data to receive cookie sync status for all prebid server adapters.
// In next phase we will read placement id's from query param and will only get cookie sync status of bidders participating in auction
var data = '{}';
ajax(ENDPOINT, process, data);