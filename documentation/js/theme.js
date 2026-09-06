(function ($) {
    'use strict';
    
    var top = $('.sidebar').offset().top;
    $(window).on('scroll', function () {
        if ($(window).scrollTop() >= top)
        {
            $(".sidebar").addClass('fixedSidebar');
        } else
        {
            $(".sidebar").removeClass('fixedSidebar');
        }
        
        scroll_topmenu();
    });
    
    $('.mainMenu li.scroll > a').on('click', function () {
        $('html, body').animate({scrollTop: $(this.hash).offset().top}, 1000);
        $('.mainMenu li').removeClass('active');
        $(this).parent('li').addClass('active');
        if($(this).parent('li').hasClass('hasChild')){
            $(this).siblings('ul.childMenu').slideToggle();
        }
        return false;
    });
    
    function scroll_topmenu() {

        var contentTop = [];
        var contentBottom = [];
        var winTop = $(window).scrollTop();
        var rangeTop = 30;
        var rangeBottom = 500;

        $('.mainMenu').find('.scroll > a').each(function () {
            var atr = $(this).attr('href');
            if ($(atr).length > 0)
            {
                contentTop.push($($(this).attr('href')).offset().top);
                contentBottom.push($($(this).attr('href')).offset().top + $($(this).attr('href')).height());
            }
        });

        $.each(contentTop, function (i) {
            if (winTop > contentTop[i] - rangeTop) {
                $('.mainMenu li.scroll').removeClass('active').eq(i).addClass('active');
            }
        });
    }

})(jQuery);