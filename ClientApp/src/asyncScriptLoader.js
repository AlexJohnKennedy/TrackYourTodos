// This is a function used to programatically add a <script> tag to the DOM, which ASYNCHRONOUSLY loads an external script
// into the window object, such that we can attach callbacks and respond once the script actually loads. The reason for
// doing this programmatically is so that we can control/respond to the loading of the external script (e.g. Google auth api, 'gapi'),
// from WITHIN our React components in order to keep the life-cycles in sync. This is necessary because the current google authentication api 
// doesn't have an NPM package we can pre-install, and adding the script directly into the index.html as an asyn-load means 
// that sometimes our React components don't know if the api has loaded yet or not. They load in parallel and sometimes React
// calls componentDidMount() before Gapi is loaded (i.e. window.gapi === undefined when componentDidMount() runs) and sometimes
// it's the other way around! So this is a reasonable way to get around this, at the expense of some parallelisation.

// THIS IS TAKEN FROM: https://stackoverflow.com/questions/47421602/html-script-is-loading-after-react-components

const loadScript = (url) => new Promise((resolve, reject) => {
    let ready = false;
    if (!document) {
      reject(new Error('Document was not defined'));
    }
    const tag = document.getElementsByTagName('script')[0];
    const script = document.createElement('script');
  
    script.type = 'text/javascript';
    script.src = url;
    script.async = true;
    script.onreadystatechange = () => {
      if (!ready && (!this.readyState || this.readyState === 'complete')) {
        ready = true;
        resolve(script);
      }
    };
    script.onload = script.onreadystatechange;
  
    script.onerror = (msg) => {
      console.log(msg);
      reject(new Error('Error loading script.'));
    };
  
    script.onabort = (msg) => {
      console.log(msg);
      reject(new Error('Script loading aboirted.'));
    };
  
    if (tag.parentNode != null) {
      tag.parentNode.insertBefore(script, tag);
    }
  });
  
  
  export default loadScript;