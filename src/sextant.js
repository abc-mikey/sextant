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

// semi-constructor for Sextant object to help manage browser histories and 
// states when programatically controlling navigation, will return a navigator 
// assistant 
function Sextant(locator, updater, hashchangesstate) {
    if (nav) return nav; // return our instance if it exists

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

    function warn(warning) {
        if (typeof window.console !== "undefined") {
            console.log(warning);
        }
    }
     
    // private helper function to call updater and then update the current state
    // and page title
    function update(state, title, url) {
        updater(state); 
        _state = state; 
        window.document.title = title; 
    }

    // TODO clear the history stack in front of the current position
    // private helper function to read return state and update the page, pushing
    // / replacing the state to the history stack
    function push(ret, replace) {
        if (typeof ret === "undefined" || ret === null || ret == '') { return; }
        replace = replace === "boolean" ? replace : false;
        var state = ret.state;
        var title = ret.title;
        var url = ret.url;
        update(state, title, url); // do this by hand when performing navigation
                                   // as "popstate" wont give us the current 
                                   // state when pushing
        if (replace == true) {
            history.replaceState(nav.ret(state, title, url), title, url);
        } else {
            history.pushState(nav.ret(state, title, url), title, url); 
        }
    }

    // navigator assistant 
    var nav = { 
        
        // helper function to return a valid state / title / url object
        ret: function (state, title, url) { 
            return { state: state, title: title, url: url }; 
        },

        // private helper function to go to a new state
        go: function (callback) {
            if (typeof callback !== "function") {
                throw "navigator go expects a function reference";
            }
            push(callback(_state)); 
        },

        goJSON: function (url_callback, callback, err_callback) {
            if (typeof callback !== "function") {
                throw "navigator goJSON expects a function reference";
            }
            if (typeof url_callback !== "function") {
                throw "navigator goJSON expects a function reference";
            }
            if (typeof window.jQuery === "undefined") { 
                warn("goJSON unavailable without jQuery"); 
                return; 
            }
            var url = url_callback(_state);
            if (typeof url === "undefined" || url === null || url == '') { 
                return; 
            }

            // section granting jQuery safe access to dollar
            (function( $ ) {
                
                $.getJSON(url, function (json, stat) {
                    if (stat == "success") {
                        push(callback(json, _state)); 
                    } else if (typeof err_callback === "function") {
                        err_callback(stat, _state);
                    } else {
                        warn("Failed to open page: "+url);
                    }
                });
            }( jQuery ));
        },
            
        // private helper function to initialise the page using the callabck to
        // retrieve the state from the url
        init: function () {
            push(locator(window.location.href), true); 
        },

        // TODO Tidy this up
        initState: function () {
            function helper(ret) {
                if (typeof ret === "undefined" || ret === null || ret == '') { return; }
                var state = ret.state;
                var title = ret.title;
                var url = ret.url;
                update(state, title, url); // do this by hand when performing navigation
                                           // as "popstate" wont give us the current 
                                           // state when pushing
            }
            helper(locator(window.location.href)); 
        }
    };


    if (typeof window.jQuery === "undefined") {
        warn("Warning, jQuery not loaded. Continuing Sextant without jQuery.");
    } else {
        // section granting jQuery safe access to dollar
        (function( $ ) {

            // jQuery to add init to page ready and - if used - hashchange
            $(document).ready(nav.init);
            if (hashchangesstate == true) { 
                // this appears to be firing on navigation via history buttons 
                // on Firefox, however it is required to make changing the URL 
                // to load the new state
                // what is needed is an alternative to init that does not push 
                // to the history but does load the sate
                $(window).on("hashchange", nav.initState);

            // suppress updates on popstate event if using hashchange events as
            // they enter a race condition
            } else { 

                // on history popstate change call the updater callback with the
                // current state so it can update the page
                window.addEventListener("popstate", function (event) { 
                    if (event.state !== null) { // weirdly this only gives the 
                                                // state if navigating using the
                                                // history on the browser even 
                                                // though it fires on 
                                                // history.pushState()
                        update(event.state.state, 
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
                    nav.go(callback);
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
                    nav.goJSON(url_callback, callback, err_callback);
                });
                return this;
            };
        }( jQuery ));
    }

    return nav; // return the navigator assistant 
}
