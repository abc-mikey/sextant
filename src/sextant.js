/*The MIT License (MIT)

Copyright (c) 2015 abc-mikey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/

// new page object  to return a valid state / title / url object
function SextantPage (state, title, url) { 
  return { state: state, title: title, url: url }; 
}

/*
 * Setup Sextant
 *   locator - function that takes the url and returns a SextantPage
 *   builder - function that takes the state and builds the page
 *   hashchangestate - optional parameter which when true makes changes to the hash part of the url trigger the change state event
 */ 
function Sextant(locator, builder, hashchangesstate) {
    // TODO add callonce check

    // helper function for safely printing to the console
    function warn(warning) {
        if (typeof window.console !== "undefined") {
            console.log(warning);
        }
    }

    if (typeof builder !== "function") {
        throw "Sextant constructor expects a function reference for builder";
    }
    if (typeof locator !== "function") {
        throw "Sextant constructor expects a function reference for locator";
    }

    var _state;
    hashchangesstate = typeof hashchangesstate === "boolean" 
                     ? hashchangesstate 
                     : false;

    // private helper function to call builder and then build the current state
    // and page title
    function build(state, title, url) {
        builder(state); 
        _state = state; 
        window.document.title = title; 
    }


    // private helper function to read return state and build the page, pushing
    // or replacing the state on the history stack
    function push(page, replace) {
        if (typeof page === "undefined" || page === null || page == '') { return; }
        replace = replace === "boolean" ? replace : false;
        var state = page.state;
        var title = page.title;
        var url = page.url;
        build(state, title, url); // do this by hand when performing navigation
                                   // as "popstate" wont give us the current 
                                   // state when pushing
        if (replace == true) {
            history.replaceState(SextantPage(state, title, url), title, url);
        } else {
            history.pushState(SextantPage(state, title, url), title, url); 
        }
    }


    // TODO Tidy this up
    function nav_initState  () {
        function helper(page) {
            if (typeof page === "undefined" || page === null || page == '') { 
                return; 
            }
            var state = page.state;
            var title = page.title;
            var url = page.url;
            build(state, title, url); // do this by hand when performing 
                                       // navigation as "popstate" wont 
                                       // give us the current state when 
                                       // pushing
        }
        helper(locator(window.location.href)); 
    }


    if (typeof window.jQuery === "undefined") {
        warn("jQuery not loaded. Make sure that jQuery script is included "+
             "before calling Sextant function.");
    } else {
        // section granting jQuery safe access to dollar
        (function( $ ) {

            // jQuery to add init to page ready and - if used - hashchange
            $(document).ready(function () {
              push(locator(window.location.href), true); 
            });
            // TODO this needs an equivelent for not using jQuery, or maybe drop
            // non jQuery support
            if (hashchangesstate == true) { 
                // this appears to be firing on navigation via history buttons 
                // on Firefox, however it is required to make changing the URL 
                // to load the new state
                // what is needed is an alternative to init that does not push 
                // to the history but does load the sate
                $(window).on("hashchange", nav_initState);

            // suppress updates on popstate event if using hashchange events as
            // they enter a race condition
            } else { 

                // on history popstate change call the builder callback with the
                // current state so it can build the page
                window.addEventListener("popstate", function (event) { 
                    if (event.state !== null) { // weirdly this only gives the 
                                                // state if navigating using the
                                                // history on the browser even 
                                                // though it fires on 
                                                // history.pushState()
                        build(event.state.state, 
                               event.state.title, 
                               event.state.url);
                    }
                });
            }

            // call the new_state callback with the current state and read the 
            // new state and url from it, then update the history which 
            // generates a popstate that updates the page
            $.fn.go = function (callback) {
                if (typeof callback !== "function") {
                    throw "Sextant go expects a function reference";
                }
                this.click(function (event) {
                    event.preventDefault();
                    
                    if (typeof callback !== "function") {
                        throw "navigator go expects a function reference";
                    }
                    push(callback(_state)); 
                });
                return this;
            };

            $.fn.goJSON = function (url_callback, callback, err_callback) {
                if (typeof callback !== "function") {
                    throw "navigator goJSON expects a function reference";
                }
                if (typeof url_callback !== "function") {
                    throw "navigator goJSON expects a function reference";
                }
                this.click(function (event) {
                    event.preventDefault();
                    
                    var url = url_callback(_state);
                    if (typeof url === "undefined" || url === null || url == '') { 
                        return; 
                    }

                    $.getJSON(url, function (json, stat) {
                        if (stat == "success") {
                            push(callback(json, _state)); 
                        } else if (typeof err_callback === "function") {
                            err_callback(stat, _state);
                        } else {
                            warn("Failed to open page: "+url);
                        }
                    });
                });
                return this;
            };
        }( jQuery ));
    }
}
