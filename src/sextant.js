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


var snglSextant = (function() {
    // reference
    var do_once;

    function init() {
        // TODO initialise my singleton
        // TODO add private methods / properties to singleton
        return {
            // TODO add public methods / properties
        };

    };

    // return the object to use like "Sextant.goTo()"
    return {

        // settup Sextant 
        setup: function() {
          if (do_once) throw "only once";
          else do_once = 1;
     
        }, 

        // 
        goTo: function () {
     
        },

        goToJSON: function () {
     
        },

        page: function() {

        }
    };
})();

// page constructor that takes: state, title, url
function SextantPage(state, title, url) {
    return {
        state: state,
        title: title,
        url: url
    };
}

/**
 * Setup Sextant jQuery plugin: 
 *   locator - function that takes the url and returns a SextantPage
 *   updater - function that takes the state and updates the page
 *   hashchangestate - optional parameter which when true makes changes to the 
 *                     hash part of the url trigger the change state event
 *
 * jQuery plugin functions:
 *   clickTo     - on click callback function to take state and return 
 *                 SextantPage to navigate to
 *   clickToJSON - on click call url callback with state to return the JSON url 
 *                 to call, pass JSON response to callback to return SextantPage
 *                 to navigate to
 *
 * TODO The simplified version now only provides jQuery functions for handling 
 *      clicks. Add back functions for doing navigation manually.
 */
function Sextant(locator, updater, hashchangesstate) {
    // TODO add call once check
    if (typeof updater !== "function") {
        throw "Sextant constructor expects a function reference for updater";
    }
    if (typeof locator !== "function") {
        throw "Sextant constructor expects a function reference for locator";
    }

    var _state;
    hashchangesstate = typeof hashchangesstate === "boolean" 
                     ? hashchangesstate 
                     : false;

    /*
     * Private functions 
     */

    // safely print warnings to the console
    function warn(warning) {
        if (typeof window.console !== "undefined") {
            console.log(warning);
        }
    }

    // update the page, setting the title, the state and calling the updater
    // returns true on success (updater may return "false" to indicate failure)
    function update(page) {
        if (
            typeof page === "undefined" 
            || page === null 
            || page == ''
        ) return false;

        if (updater(page.state) == false) return false;
        _state = page.state;
        window.document.title = page.title;
        return true;
    }

    // update the page and push or replace the state onto the history stack
    function push(page, replace) {
        // default to push not replace
        replace = replace === "boolean" ? replace : false;

        // do this by hand when performing navigation as "popstate" wont give 
        // us the current state when pushing
        if (!update(page)) return;
        if (replace == true) {
            history.replaceState(page, page.title, page.url);
        } else {
            history.pushState(page, page.title, page.url);
        }
    }

    if (typeof window.jQuery === "undefined") {
        warn("jQuery not loaded. Make sure that jQuery script is included " + 
             "before calling Sextant function.");
    } else {
        // section granting jQuery safe access to dollar
        (function ($) {
            /**
             * jQuery event handlers
             */

            // update and replace history on page load
            $(document).ready(function () {
                push(locator(window.location.href), true);
            });

            if (hashchangesstate == true) {
                // this appears to be firing on navigation via history buttons 
                // on Firefox, however it is required to make changing the URL 
                // load the new state
                $(window).on("hashchange", function () {
                    update(locator(window.location.href));
                });

                // suppress updates on popstate event if using hashchange events 
                // as they enter a race condition
            } else {

                // on history popstate change call the updater callback with the
                // current state so it can update the page
                window.addEventListener("popstate", function (event) {
                    if (event.state !== null) { // weirdly this only gives the 
                        // state if navigating using the history on the browser 
                        // even though it fires on history.pushState()
                        update(SextantPage(event.state.state, 
                                           event.state.title,
                                           event.state.url));
                    }
                });
            }

            /**
             * jQuery plugin functions
             */

            // call the new_state callback with the current state and read the 
            // new state and url from it, then update the history which 
            // generates a popstate that updates the page
            $.fn.clickTo = function (callback) {
                if (typeof callback !== "function") {
                    throw "Sextant clickTo expects a function reference";
                }
                // TODO check that "this" supports click
                this.click(function (event) {
                    event.preventDefault();
                    push(callback(_state));
                });
                return this;
            };

            $.fn.clickToJSON = function (url_callback, callback, err_callback) {
                if (typeof url_callback !== "function") {
                    throw "Sextant clickToJSON expects a url_callback " +
                          "function reference";
                }
                if (typeof callback !== "function") {
                    throw "Sextant clickToJSON expects a callbcak function " +
                          "reference";
                }
                // TODO check that "this" supports click
                this.click(function (event) {
                    event.preventDefault();

                    var url = url_callback(_state);
                    if (
                        typeof url === "undefined" 
                        || url === null 
                        || url == ''
                    ) return;

                    $.getJSON(url, function (json, stat) {
                        if (stat == "success") {
                            push(callback(json, _state));
                        } else if (typeof err_callback === "function") {
                            err_callback(stat, _state);
                        } else {
                            warn("Failed to open page: " + url);
                        }
                    });
                });
                return this;
            };
        } (jQuery));
    }
}
