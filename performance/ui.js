$(document).ready(function()
{

    // Definitions...

    var perfForm = $('#performaceForm'),
        flSwitch = $('#flSwitch'),
        cruiseAlt = $('#cruiseAltInput'),
        tempInput = perfForm.find('input[name="temperatureInput"]'),
        isaDevField = $('#isaTempDev');



    // Add event listeners
    perfForm.on('submit', onSubmit);
    flSwitch.on('change', onChangeFLSwitch);
    tempInput.on('change', onChangeTemp);


    // Events
    function onSubmit(e)
    {
        e.preventDefault();
    }

    function onChangeFLSwitch(e)
    {
        window.useFL = flSwitch.is(':checked');

        if (cruiseAlt.val() == '') {
            return;
        }

        if (useFL) {
            cruiseAlt.attr('maxlength', '3');
            cruiseAlt.val(Math.round(parseInt(cruiseAlt.val(), 10) / 100));
        } else {
            cruiseAlt.attr('maxlength', '5');
            cruiseAlt.val(parseInt(cruiseAlt.val(), 10) * 100);
        }
    }

    function onChangeTemp(e)
    {
        var temp = parseInt(tempInput.val(), 10);
        if (isNaN(temp)) {
            return false;
        }

        var deviation = temp - 15;
        if (deviation == 0) {
            deviation = '';
        }

        var isaDevText = temp > 15 ? 'ISA+'+ deviation : 'ISA'+ deviation;
        isaDevField.val(isaDevText);
    }

});

