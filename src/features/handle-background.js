module.exports = function handleBackground(tiled) {
    var tiled = tiled || false;
    
    var canvasID = 'custom-bg';

    if($("#"+canvasID).length === 0) {
        var $bg = $('<canvas />');
            $bg.attr('id', canvasID);
        $('#channel').prepend($bg);
    }

    if(!window.App || !App.__container__.lookup('controller:Channel') || !App.__container__.lookup('controller:Channel').get('content.panels')) return;
    App.__container__.lookup('controller:Channel').get('content.panels.content').forEach(function(panel) {
        var url = panel.get('data').link;
        var safeRegex = /^https?:\/\/cdn.betterttv.net\//;
        if(url && url.indexOf('#BTTV#') !== -1) {
            var options = {};
            var queryString = url.split('#BTTV#')[1];
            var list = queryString.split('=');

            for(var i=0; i<list.length; i+=2) {
                if(list[i+1] && safeRegex.test(list[i+1])) {
                    options[list[i]] = list[i+1];
                }
            }

            if(options['bg']) {
                $("#"+canvasID).attr('image', options['bg']);
            }
        }
    });

    if(tiled) {
        $("#"+canvasID).addClass('tiled');
    } else {
        if($("#"+canvasID).attr("image")) {
            var img = new Image();
            img.onload = function() {
                if(img.naturalWidth < $('#main_col').width()) {
                    setTimeout(function(){
                        handleBackground(true);
                    }, 2000);
                }
            }
            img.src = $("#"+canvasID).attr("image");
        }
    }

    var g = $("#"+canvasID),
        d = g[0];
    if (d && d.getContext) {
        var c = d.getContext("2d"),
            h = $("#"+canvasID).attr("image");
        if (!h) {
            $(d).css("background-image", "");
            c.clearRect(0, 0, d.width, d.height);
        } else if (g.css({
            width: "100%",
            "background-position": "center top"
        }), g.hasClass("tiled")) {
            g.css({
                "background-image": 'url("' + h + '")'
            }).attr("width", 200).attr("height", 200);
            d = c.createLinearGradient(0, 0, 0, 200);
            if (bttv.settings.get("darkenedMode") === true) {
                d.addColorStop(0, "rgba(20,20,20,0.4)");
                d.addColorStop(1, "rgba(20,20,20,1)");
            } else {
                d.addColorStop(0, "rgba(245,245,245,0.65)");
                d.addColorStop(1, "rgba(245,245,245,1)");
            }
            c.fillStyle = d;
            c.fillRect(0, 0, 200, 200);
        } else {
            var i = document.createElement("IMG");
            i.onload = function () {
                var a = this.width,
                    d = this.height,
                    h;
                g.attr("width", a).attr("height", d);
                c.drawImage(i, 0, 0);
                if (bttv.settings.get("darkenedMode") === true) {
                    d > a ? (h = c.createLinearGradient(0, 0, 0, a), h.addColorStop(0, "rgba(20,20,20,0.4)"), h.addColorStop(1, "rgba(20,20,20,1)"), c.fillStyle = h, c.fillRect(0, 0, a, a), c.fillStyle = "rgb(20,20,20)", c.fillRect(0, a, a, d - a)) : (h = c.createLinearGradient(0, 0, 0, d), h.addColorStop(0, "rgba(20,20,20,0.4)"), h.addColorStop(1, "rgba(20,20,20,1)"), c.fillStyle = h, c.fillRect(0, 0, a, d))
                } else {
                    d > a ? (h = c.createLinearGradient(0, 0, 0, a), h.addColorStop(0, "rgba(245,245,245,0.65)"), h.addColorStop(1, "rgba(245,245,245,1)"), c.fillStyle = h, c.fillRect(0, 0, a, a), c.fillStyle = "rgb(245,245,245)", c.fillRect(0, a, a, d - a)) : (h = c.createLinearGradient(0, 0, 0, d), h.addColorStop(0, "rgba(245,245,245,0.65)"), h.addColorStop(1, "rgba(245,245,245,1)"), c.fillStyle = h, c.fillRect(0, 0, a, d))
                }
            };
            i.src = h;
        }
    }
}