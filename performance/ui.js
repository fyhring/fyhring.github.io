$(document).ready(function()
{

    // Definitions...

    var perfForm = $('#performanceForm'),
        flSwitch = $('#flSwitch'),
        cruiseAlt = $('#cruiseAltInput'),
        tempInput = perfForm.find('input[name="temperatureInput"]'),
        isaDevField = $('#isaTempDev'),
        incSpdSwitch = $('#increasedSpeedsSwitch'),
        MSAROCSwitch = $('#useMSA');

    // Add event listeners
    perfForm.on('submit', onSubmit);
    flSwitch.on('change', onChangeFLSwitch);
    tempInput.on('change', onChangeTemp);
    incSpdSwitch.on('change', onChangeIncSpdSwitch);
    MSAROCSwitch.on('change', onChangeUseMSASwitch);


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

        calculateFromInputs();
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

    function onChangeIncSpdSwitch(e)
    {
        window.useIncreaedAppSpeed = incSpdSwitch.is(':checked');
        calculateFromInputs();
    }

    function onChangeUseMSASwitch(e)
    {
        window.useMSAROC = MSAROCSwitch.is(':checked');
        calculateFromInputs();
    }

});

