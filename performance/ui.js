$(document).ready(function()
{

    // Definitions...

    var perfForm     = $('#performanceForm'),
        flSwitch     = $('#flSwitch'),
        cruiseAlt    = $('#cruiseAltInput'),
        msa          = $('#msaInput'),
        tempInput    = perfForm.find('input[name="temperatureInput"]'),
        isaDevField  = $('#isaTempDev'),
        incSpdSwitch = $('#increasedSpeedsSwitch'),
        MSAROCSwitch = $('#useMSA'),
        windSwitch   = $('#useWindCorrection'),
        pavedSwitch  = $('#usePavedRWY'),
        softSwitch   = $('#useSoftSfc');
        

    // Add event listeners
    perfForm.on('submit', onSubmit);
    tempInput.on('change', onChangeTemp);
    flSwitch.on('change', onChangeFLSwitch);
    incSpdSwitch.on('change', onChangeFlag.bind(null, 'useIncreaedAppSpeed', incSpdSwitch));
    MSAROCSwitch.on('change', onChangeFlag.bind(null, 'useMSAROC', MSAROCSwitch));
    windSwitch.on('change', onChangeFlag.bind(null, 'useWindComponent', windSwitch));
    pavedSwitch.on('change', onChangeFlag.bind(null, 'usePavedRWY', pavedSwitch));
    softSwitch.on('change', onChangeFlag.bind(null, 'useSoftSfc', softSwitch));

    $(document).on('keydown', onKeyDown);

    // Events
    function onSubmit(e)
    {
        e.preventDefault();
    }

    function onKeyDown(e)
    {
        // console.log(e.keyCode, e.metaKey, e);

        // CMD + P
        if (e.metaKey === true && e.keyCode === 80) {
            e.preventDefault();
            window.triggerPrint();
        }
    }

    function onChangeFlag(flagName, UIElement, event)
    {
        window[flagName] = UIElement.is(':checked');
        calculateFromInputs();   
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

});
