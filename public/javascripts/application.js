$(function() {
  $('#announcement a[rel=close]').click(function() {
    $('#announcement').fadeOut(500, function() {
      $('body').removeClass('announcement');
    });
    return false;
  });
});