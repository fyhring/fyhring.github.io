
// Constants
var STD_PRESSURE = 1013; // hPa
var STD_HECTOPASCAL_HEIGHT = 27; // ft
var stdVy = 84
var stdVySe = 84
var stdVx = 72
var stdVxSe = 83

// Flags
var useFL = false;
var usePavedRWY = true;
var useSoftSfc = false;
var useSnowCorrection = false;
var useSlope = false;
var useWindComponent = true;
var useIncreasedAppSpeed = true;
var useMSAROC = false;
var useCalculatedClimbSpeedsInGradients = false;


// Global Inputs
var elevationInput,
    temperatureInput,
    pressureInput,
    windDirInput,
    windSpdInput,
    rwyDirInput,
    weightInput,
    cruiseInput,
    msaInput,
    daMdaInput;

$(document).ready(function()
{
    $('#performanceForm input,#massForm input').on('change', function(e)
    {
        calculateFromInputs();
        MathJax.typeset();
    });
});

function triggerPrint()
{
    window.renderPrintableLoadSheet();
    setTimeout(() => {
        window.print();
    }, 300);
}

function calculateFromInputs()
{
    elevationInput = parseInt($('#performanceForm input[name="elevationInput"]').val(), 10),
    temperatureInput = parseInt($('#performanceForm input[name="temperatureInput"]').val(), 10),
    pressureInput  = parseInt($('#performanceForm input[name="pressureInput"]').val(), 10),
    cruiseInput    = parseInt($('#performanceForm input[name="cruiseAltInput').val(), 10),
    msaInput       = parseInt($('#performanceForm input[name="msaInput').val(), 10),
    windDirInput   = parseInt($('#performanceForm input[name="windDirInput"]').val(), 10),
    windSpdInput   = parseInt($('#performanceForm input[name="windSpdInput"]').val(), 10),
    rwyDirInput    = parseInt($('#performanceForm input[name="rwyDirInput"]').val(), 10),
    daMdaInput     = parseInt($('#performanceForm input[name="daMdaInput"]').val(), 10),
    weightInput    = window.acTotalMass;

    if (
        (isNaN(elevationInput)) ||
        (isNaN(temperatureInput)) ||
        (isNaN(pressureInput)) ||
        (isNaN(cruiseInput)) ||
        (isNaN(msaInput)) ||
        (isNaN(windDirInput)) ||
        (isNaN(windSpdInput)) ||
        (isNaN(rwyDirInput)) ||
        (isNaN(daMdaInput)) ||
        (weightInput == null)
    ) {

        var takeOffLandingUIPairs = [
            ['to-groundroll', null, 'm'],
            ['to-distance', null, 'm'],
            ['ldg-groundroll', null, 'm'],
            ['ldg-distance', null, 'm'],
            ['minima-uncorrected', null, 'ft'],
            ['tempCorrectionToMinima', null, 'ft']
        ];
    
        updateUIValues(takeOffLandingUIPairs);

        return false;
    }

    // Temp ISA Deviation
    var tempIsaDeviation = toISAdeviation(temperatureInput, elevationInput);

    // Calculate pressure altitude of AD elevation.
    var pressureElevation = elevationInput,
        pressureAltitude  = cruiseInput,
        pressureMSA       = msaInput;

    if (pressureInput != STD_PRESSURE) {

        pressureElevation = toPressureAltitude(elevationInput);
        pressureMSA = toPressureAltitude(pressureMSA);

        // If we use FL we don't correct for pressure.
        if (!useFL) {
            pressureAltitude = toPressureAltitude(cruiseInput);
        } else {
            pressureAltitude = cruiseInput * 100;
        }

        /* I dont think we need this code anymore, as we can extrapolate outside matrix data
        // Pressure Elevation must not be less than 0, no data in matrix below 0.
        if (pressureElevation < 0) {
            pressureElevation = 0;
        }
        */
    } else {
        if (useFL) {
            pressureAltitude = cruiseInput * 100;
        }
    }

    var data = calculateAll(pressureElevation, pressureAltitude, pressureMSA, tempIsaDeviation, weightInput, daMdaInput);

    var rocAltitude = toTrueAltitude(getROCAltitude(pressureMSA, pressureAltitude, pressureElevation)),
        rocPressureAlt = toPressureAltitude(rocAltitude);

    data.env = {
        qnh: pressureInput,
        pressureCorrection: (1013-pressureInput)*27,
        temp: temperatureInput,
        isaDev: tempIsaDeviation,
        weight: weightInput,
        elevation: elevationInput,
        pressureElevation: pressureElevation,
        cruiseAlt: cruiseInput,
        cruisePressureAltitude: pressureAltitude,
        rocAlt: Math.floor(rocAltitude),
        rocPressureAlt: Math.floor(rocPressureAlt)
    };

    var temperatures = Object.keys(data.takeoff.uncorrectedGround.data['1D1']);
    var ROCVySeTemperatures = Object.keys(data.rocVySe.data['1D1']);
    var ROCVyTemperatures = Object.keys(data.rocVy.data['1D1']);
    var ceilingTemperatures = Object.keys(data.OEIserviceCeiling.data[2][2].data['1D1']);
    var weights = Object.keys(data.takeoff.uncorrectedGround.data['2D']);

    var takeOffLandingUIPairs = {
        'to-groundroll': [Math.ceil(data.takeoff.groundroll), 'm'],
        'to-distance': [Math.ceil(data.takeoff.distance), 'm'],
        'ldg-groundroll': [Math.ceil(data.landing.groundroll), 'm'],
        'ldg-distance': [Math.ceil(data.landing.distance), 'm'],
        'to-asdr': [Math.ceil(data.ASDR.corrected), 'm'],
        'to-asdr-uncorrected': [Math.ceil(data.ASDR.uncorrected), 'm'],
        'minima-uncorrected': [daMdaInput,'ft'],
        'minima-agl-uncorrected': [daMdaInput-elevationInput, 'ft'],
        'minima-pa-uncorrected': [toPressureAltitude(daMdaInput),'ft'],
        'minima-ph-uncorrected': [toPressureAltitude(daMdaInput)-toPressureAltitude(elevationInput),'ft'],
        'tempCorrectionToMinima': [Math.ceil(data.tempCorrectionToMinima),'ft'],
        'minima-corrected': [daMdaInput + Math.ceil(data.tempCorrectionToMinima), 'ft'],
        'oei-serviceceil': [ceilingCheck(data.OEIserviceCeiling), 'ft'],
        'oei-absceil': [ceilingCheck(data.OEIabsoluteCeiling), 'ft'],
        'vyse': [Math.round(data.VySe.result), 'kias'],
        'roc-vyse': [Math.floor(data.rocVySe.result), 'fpm'],
        'grad-vyse': [(Math.floor(data.gradVySe.result * 10000)/100),'%'],
        'angle-vyse': [(Math.floor(data.angleVySe * 100)/100),'&#176'],
        'vy': [Math.round(data.Vy.result),'kias'],
        'roc-vy': [Math.floor(data.rocVy.result), 'fpm'],
        'grad-vy': [(Math.floor(data.gradVy.result * 10000)/100),'%'],
        'angle-vy': [(Math.floor(data.angleVy * 100)/100),'&#176'],
        'min-in-climb': [data.minInClimb.string,'min'],
        'dist-in-climb': [Math.ceil(data.distInClimb*100)/100, 'NM'],
        'time-in-climb-vy': [Math.round(data.minInClimb.Vy.result),'kts'],
        'to-vy': [Math.round(data.toVy.result),'kias'],
        'to-roc-vy': [Math.round(data.toRocVy.result),'fpm'],
        'to-grad-vy': [(Math.floor(data.toGradVy * 10000)/100),'%'],
        //'to-angle-vy': [(Math.floor(data.angleToVy * 100)/100),'&#176'],   //Calculation not yet made
        'vxse': [Math.round(data.VxSe.result), 'kias'],
        'roc-vxse': [Math.floor(data.rocVxSe.result), 'fpm'],
        'grad-vxse': [(Math.floor(data.gradVxSe.result * 10000)/100),'%'],
        'angle-vxse': [(Math.floor(data.angleVxSe * 100)/100),'&#176'],
        'vx': [Math.round(data.Vx.result),'kias'],
        'roc-vx': [Math.floor(data.rocVx.result), 'fpm'],
        'grad-vx': [(Math.floor(data.gradVx.result * 10000)/100),'%'],
        'angle-vx': [(Math.floor(data.angleVx * 100)/100),'&#176'],
        'to-vx': [Math.round(data.toVx.result),'kias'],
        'to-roc-vx': [Math.round(data.toRocVx.result),'fpm'],
        'to-grad-vx': [(Math.floor(data.toGradVx * 10000)/100),'%'],
        //'to-angle-vx': [(Math.floor(data.angleToVx * 100)/100),'&#176'],   //Calculation not yet made
        'useMSAOrNotTxt': [(useMSAROC ? 'MSA' : '2/3 cruise alt.'), ''],
        'fuelConsumption1E': [Math.ceil(data.FuelConsumption.result*10)/10,'lt/h'],
        'fuelConsumption2E': [Math.ceil(data.FuelConsumption.result * 20)/10,'lt/h'],
        'powerSetting': [Math.ceil(data.Powersetting.result*10)/10,'%'],
        'KTAS': [Math.round(data.KTAS.result),'kts'],

        // General interpolation data
        'to-temp1': [data.takeoff.uncorrectedGround.keys.temp1, '&deg;C'],
        'to-temp2': [data.takeoff.uncorrectedGround.keys.temp2, '&deg;C'],
        'to-temp3': [data.takeoff.uncorrectedGround.keys.temp3, '&deg;C'],
        'to-alt1': [data.takeoff.uncorrectedGround.keys.alt1, 'ft'],
        'to-alt2': [data.takeoff.uncorrectedGround.keys.alt2, 'ft'],
        'to-alt3': [data.takeoff.uncorrectedGround.keys.alt3, 'ft'],
        'to-mass1': [data.takeoff.uncorrectedGround.keys.mass1, 'kg'],
        'to-mass2': [data.takeoff.uncorrectedGround.keys.mass2, 'kg'],
        'to-mass3': [data.takeoff.uncorrectedGround.keys.mass3, 'kg'],
        'ldg-temp1': [data.landing.uncorrectedGround.keys.temp1, '&deg;C'],
        'ldg-temp2': [data.landing.uncorrectedGround.keys.temp2, '&deg;C'],
        'ldg-temp3': [data.landing.uncorrectedGround.keys.temp3, '&deg;C'],
        'ldg-alt1': [data.landing.uncorrectedGround.keys.alt1, 'ft'],
        'ldg-alt2': [data.landing.uncorrectedGround.keys.alt2, 'ft'],
        'ldg-alt3': [data.landing.uncorrectedGround.keys.alt3, 'ft'],
        'ldg-mass1': [data.landing.uncorrectedGround.keys.mass1, 'kg'],
        'ldg-mass2': [data.landing.uncorrectedGround.keys.mass2, 'kg'],
        'ldg-mass3': [data.landing.uncorrectedGround.keys.mass3, 'kg'],
        'oei-roc-vyse-temp1': [data.rocVySe.keys.temp1, '&deg;C'],
        'oei-roc-vyse-temp2': [data.rocVySe.keys.temp2, '&deg;C'],
        'oei-roc-vyse-temp3': [data.rocVySe.keys.temp3, '&deg;C'],
        'oei-roc-vyse-alt1': [data.rocVySe.keys.alt1, 'ft'],
        'oei-roc-vyse-alt2': [data.rocVySe.keys.alt2, 'ft'],
        'oei-roc-vyse-alt3': [Math.round(data.rocVySe.keys.alt3), 'ft'],
        'oei-roc-vyse-mass1': [data.rocVySe.keys.mass1, 'kg'],
        'oei-roc-vyse-mass2': [data.rocVySe.keys.mass2, 'kg'],
        'oei-roc-vyse-mass3': [data.rocVySe.keys.mass3, 'kg'],
        'service-ceiling-roc-temp1': [data.OEIserviceCeiling.data[2][2].keys.temp1, '&deg;C'],
        'service-ceiling-roc-temp2': [data.OEIserviceCeiling.data[2][2].keys.temp2, '&deg;C'],
        'service-ceiling-roc-temp3': [data.OEIserviceCeiling.data[2][2].keys.temp3, '&deg;C'],
        'service-ceiling-roc-alt1': [data.OEIserviceCeiling.data[2][2].keys.alt1, 'ft'],
        'service-ceiling-roc-alt2': [data.OEIserviceCeiling.data[2][2].keys.alt2, 'ft'],
        'service-ceiling-roc-alt3': [Math.round(data.OEIserviceCeiling.data[2][2].keys.alt3), 'ft'],
        'service-ceiling-roc-mass1': [data.OEIserviceCeiling.data[2][2].keys.mass1, 'kg'],
        'service-ceiling-roc-mass2': [data.OEIserviceCeiling.data[2][2].keys.mass2, 'kg'],
        'service-ceiling-roc-mass3': [data.OEIserviceCeiling.data[2][2].keys.mass3, 'kg'],
        'roc-vy-temp1': [data.rocVy.keys.temp1, '&deg;C'],
        'roc-vy-temp2': [data.rocVy.keys.temp2, '&deg;C'],
        'roc-vy-temp3': [data.rocVy.keys.temp3, '&deg;C'],
        'roc-vy-alt1': [data.rocVy.keys.alt1, 'ft'],
        'roc-vy-alt2': [data.rocVy.keys.alt2, 'ft'],
        'roc-vy-alt3': [Math.round(data.rocVy.keys.alt3), 'ft'],
        'roc-vy-mass1': [data.rocVy.keys.mass1, 'kg'],
        'roc-vy-mass2': [data.rocVy.keys.mass2, 'kg'],
        'roc-vy-mass3': [data.rocVy.keys.mass3, 'kg'],
        'FC-MAP1AA': [data.FuelConsumption.keys.MAP1AA,'inHg'],
        'FC-MAP1AB': [data.FuelConsumption.keys.MAP1AB,'inHg'],
        'FC-MAP1BA': [data.FuelConsumption.keys.MAP1BA,'inHg'],
        'FC-MAP1BB': [data.FuelConsumption.keys.MAP1BB,'inHg'],
        'FC-MAP2AA': [data.FuelConsumption.keys.MAP2AA,'inHg'],
        'FC-MAP2AB': [data.FuelConsumption.keys.MAP2AB,'inHg'],
        'FC-MAP2BA': [data.FuelConsumption.keys.MAP2BA,'inHg'],
        'FC-MAP2BB': [data.FuelConsumption.keys.MAP2BB,'inHg'],
        'FC-MAP3': [data.FuelConsumption.keys.MAP3,'inHg'],
        'FC-temp1': [data.FuelConsumption.keys.temp1,'&deg;C'],
        'FC-temp2': [data.FuelConsumption.keys.temp2,'&deg;C'],
        'FC-temp3': [data.FuelConsumption.keys.temp3,'&deg;C'],
        'FC-RPM1': [data.FuelConsumption.keys.RPM1,'RPM'],
        'FC-RPM2': [data.FuelConsumption.keys.RPM2,'RPM'],
        'FC-RPM3': [data.FuelConsumption.keys.RPM3,'RPM'],
        'FC-alt1': [data.FuelConsumption.keys.alt1,'ft'],
        'FC-alt2': [data.FuelConsumption.keys.alt2,'ft'],
        'FC-alt3': [data.FuelConsumption.keys.alt3,'ft'],
        'KTAS-MAP1AA': [data.KTAS.keys.MAP1AA,'inHg'],
        'KTAS-MAP1AB': [data.KTAS.keys.MAP1AB,'inHg'],
        'KTAS-MAP1BA': [data.KTAS.keys.MAP1BA,'inHg'],
        'KTAS-MAP1BB': [data.KTAS.keys.MAP1BB,'inHg'],
        'KTAS-MAP2AA': [data.KTAS.keys.MAP2AA,'inHg'],
        'KTAS-MAP2AB': [data.KTAS.keys.MAP2AB,'inHg'],
        'KTAS-MAP2BA': [data.KTAS.keys.MAP2BA,'inHg'],
        'KTAS-MAP2BB': [data.KTAS.keys.MAP2BB,'inHg'],
        'KTAS-MAP3': [data.KTAS.keys.MAP3,'inHg'],
        'KTAS-temp1': [data.KTAS.keys.temp1,'&deg;C'],
        'KTAS-temp2': [data.KTAS.keys.temp2,'&deg;C'],
        'KTAS-temp3': [data.KTAS.keys.temp3,'&deg;C'],
        'KTAS-RPM1': [data.KTAS.keys.RPM1,'RPM'],
        'KTAS-RPM2': [data.KTAS.keys.RPM2,'RPM'],
        'KTAS-RPM3': [data.KTAS.keys.RPM3,'RPM'],
        'KTAS-alt1': [data.KTAS.keys.alt1,'ft'],
        'KTAS-alt2': [data.KTAS.keys.alt2,'ft'],
        'KTAS-alt3': [data.KTAS.keys.alt3,'ft'],
        'PWR-MAP1AA': [data.Powersetting.keys.MAP1AA,'inHg'],
        'PWR-MAP1AB': [data.Powersetting.keys.MAP1AB,'inHg'],
        'PWR-MAP1BA': [data.Powersetting.keys.MAP1BA,'inHg'],
        'PWR-MAP1BB': [data.Powersetting.keys.MAP1BB,'inHg'],
        'PWR-MAP2AA': [data.Powersetting.keys.MAP2AA,'inHg'],
        'PWR-MAP2AB': [data.Powersetting.keys.MAP2AB,'inHg'],
        'PWR-MAP2BA': [data.Powersetting.keys.MAP2BA,'inHg'],
        'PWR-MAP2BB': [data.Powersetting.keys.MAP2BB,'inHg'],
        'PWR-MAP3': [data.Powersetting.keys.MAP3,'inHg'],
        'PWR-temp1': [data.Powersetting.keys.temp1,'&deg;C'],
        'PWR-temp2': [data.Powersetting.keys.temp2,'&deg;C'],
        'PWR-temp3': [data.Powersetting.keys.temp3,'&deg;C'],
        'PWR-RPM1': [data.Powersetting.keys.RPM1,'RPM'],
        'PWR-RPM2': [data.Powersetting.keys.RPM2,'RPM'],
        'PWR-RPM3': [data.Powersetting.keys.RPM3,'RPM'],
        'PWR-alt1': [data.Powersetting.keys.alt1,'ft'],
        'PWR-alt2': [data.Powersetting.keys.alt2,'ft'],
        'PWR-alt3': [data.Powersetting.keys.alt3,'ft'],

        // Environment
        'env-qnh': [data.env.qnh, 'hPa'],
        'env-pressure-correction': [data.env.pressureCorrection, 'ft'],
        'env-temp': [data.env.temp, '&deg;'],
        'env-isa-dev': [data.env.isaDev, ''],
        'env-weight': [data.env.weight, 'kg'],
        'env-elevation': [data.env.elevation, 'ft'],
        'env-pressure-elevation': [data.env.pressureElevation, 'ft'],
        'env-cruise-alt': (!useFL ? [data.env.cruiseAlt, 'ft'] : ['FL'+ data.env.cruiseAlt, '']),
        'env-cruise-pressure-alt': [data.env.cruisePressureAltitude, 'ft'],
        'env-roc-alt': [data.env.rocAlt, 'ft'],
        'env-pressure-roc-alt': [Math.round(data.env.rocPressureAlt), 'ft'],
        'env-headOrTail-component': [getWindComponents().headOrTail+' component',''],
        'env-headwind-component': [Math.abs(getWindComponents().head),'kts'],
        'env-crosswind-component': [Math.abs(getWindComponents().cross),'kts'],

        // T/O Groundroll
        'to-g-w1-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'to-g-w1-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'to-g-w1-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'to-g-w1-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'to-g-w1-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]]), 'm'],
        'to-g-w1-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]]), 'm'],
        'to-g-w1-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedGround.data['2D'][weights[0]]), 'm'],

        'to-g-w2-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'to-g-w2-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'to-g-w2-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'to-g-w2-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'to-g-w2-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]]), 'm'],
        'to-g-w2-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]]), 'm'],
        'to-g-w2-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedGround.data['2D'][weights[1]]), 'm'],

        'to-g-w3-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedGround.data['3D']['result']), 'm'],


        // T/O Distance
        'to-d-w1-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'to-d-w1-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'to-d-w1-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'to-d-w1-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'to-d-w1-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[0]]), 'm'],
        'to-d-w1-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[1]]), 'm'],
        'to-d-w1-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedDist.data['2D'][weights[0]]), 'm'],

        'to-d-w2-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'to-d-w2-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'to-d-w2-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'to-d-w2-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'to-d-w2-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[0]]), 'm'],
        'to-d-w2-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[1]]), 'm'],
        'to-d-w2-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedDist.data['2D'][weights[1]]), 'm'],

        'to-d-w3-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedDist.data['3D']['result']), 'm'],


        // T/O Corrections
        'to-corrections-paved-rwy': [Math.ceil(data.takeoff.corrections.pavedRwyCorrection), 'm'],
        'to-corrections-sloped-rwy': [Math.ceil(data.takeoff.corrections.slopeCorrection), 'm'],
        'to-corrections-soft-rwy': [Math.ceil(data.takeoff.corrections.softSfcCorrection), 'm'],
        'to-corrections-windlabel': [(Math.abs(getWindComponents().head)),'kts '+(getWindComponents().head > 0 ? 'headwind' : 'tailwind')],
        'to-corrections-wind': [Math.ceil(data.takeoff.corrections.windCorrection), 'm'],
        'to-corrections-combined': [Math.ceil(data.takeoff.corrections.combined), 'm'],
        //Corrected distances
        'to-g-corrected': [Math.ceil(data.takeoff.uncorrectedGround.data['3D']['result'] + data.takeoff.corrections.combined), 'm'],
        'to-d-corrected': [Math.ceil(data.takeoff.uncorrectedDist.data['3D']['result'] + data.takeoff.corrections.combined), 'm'],
        //Factorized distances
        'to-g-final': [Math.ceil(data.takeoff.groundroll), 'm'],
        'to-d-final': [Math.ceil(data.takeoff.distance), 'm'],


        // Ldg Groundroll
        'ldg-g-w1-alt1-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-g-w1-alt1-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-g-w1-alt2-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-g-w1-alt2-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-g-w1-alt3-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[0]]), 'm'],
        'ldg-g-w1-alt3-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[1]]), 'm'],
        'ldg-g-w1-alt3-temp3': [Math.ceil(data.landing.uncorrectedGround.data['2D'][weights[0]]), 'm'],

        'ldg-g-w2-alt1-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-g-w2-alt1-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-g-w2-alt2-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-g-w2-alt2-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-g-w2-alt3-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[0]]), 'm'],
        'ldg-g-w2-alt3-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[1]]), 'm'],
        'ldg-g-w2-alt3-temp3': [Math.ceil(data.landing.uncorrectedGround.data['2D'][weights[1]]), 'm'],

        'ldg-g-w3-alt3-temp3': [Math.ceil(data.landing.uncorrectedGround.data['3D']['result']), 'm'],

        // Ldg Distance
        'ldg-d-w1-alt1-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-d-w1-alt1-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-d-w1-alt2-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-d-w1-alt2-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-d-w1-alt3-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[0]]), 'm'],
        'ldg-d-w1-alt3-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[1]]), 'm'],
        'ldg-d-w1-alt3-temp3': [Math.ceil(data.landing.uncorrectedDist.data['2D'][weights[0]]), 'm'],

        'ldg-d-w2-alt1-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-d-w2-alt1-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-d-w2-alt2-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-d-w2-alt2-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-d-w2-alt3-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[0]]), 'm'],
        'ldg-d-w2-alt3-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[1]]), 'm'],
        'ldg-d-w2-alt3-temp3': [Math.ceil(data.landing.uncorrectedDist.data['2D'][weights[1]]), 'm'],

        'ldg-d-w3-alt3-temp3': [Math.ceil(data.landing.uncorrectedDist.data['3D']['result']), 'm'],

        // Ldg Corrections
        'ldg-corrections-paved-rwy': [Math.ceil(data.landing.corrections.pavedRwyCorrection), 'm'],
        'ldg-corrections-sloped-rwy': [Math.ceil(data.landing.corrections.slopeCorrection), 'm'],
        'ldg-corrections-soft-rwy': [Math.ceil(data.landing.corrections.softSfcCorrection), 'm'],
        'ldg-corrections-windlabel': [Math.abs(getWindComponents().head),'kts '+(getWindComponents().head > 0 ? 'headwind' : 'tailwind')],
        'ldg-corrections-wind': [Math.ceil(data.landing.corrections.windCorrection), 'm'],
        'ldg-corrections-app-spd': [Math.ceil(data.landing.corrections.appSpeedCorrection), 'm'],
        'ldg-corrections-combined': [floorOrCeil(data.landing.corrections.combined), 'm'],
        //Corrected distances
        'ldg-g-corrected': [Math.ceil(data.landing.uncorrectedGround.data['3D']['result'] + data.landing.corrections.combined), 'm'],
        'ldg-d-corrected': [Math.ceil(data.landing.uncorrectedDist.data['3D']['result'] + data.landing.corrections.combined), 'm'],
        //Factorized distances
        'ldg-g-final': [Math.ceil(data.landing.groundroll), 'm'],
        'ldg-d-final': [Math.ceil(data.landing.distance), 'm'],


        // ASDR
        'asdr-uncorrected': [Math.ceil(data.ASDR.uncorrected), 'm'],
        'asdr-correction-ldg-spd': [Math.ceil(data.ASDR.corrections.ldgCorrection), 'm'],
        'asdr-corrections-wind': [Math.ceil(data.ASDR.corrections.wind), 'm'],
        'asdr-correction-sum-before-safety': [Math.ceil(data.ASDR.beforeSafetyCorrection), 'm'],
        'asdr-correction-safety-factor': [Math.ceil(data.ASDR.corrections.safetyFactor), 'm'],
        'asdr-correction-sum-before-time': [Math.ceil(data.ASDR.beforeTimeCorrection), 'm'],
        'asdr-correction-time-factor': [Math.ceil(data.ASDR.corrections.timeFactor), 'm'],
        'asdr-corrected': [Math.ceil(data.ASDR.corrected), 'm'],

        //MINIMA corrections
        'minima-temp-0': [data.minimaCorrectionTable.temps[0],'&deg;C'],
        'minima-temp-1': [data.minimaCorrectionTable.temps[1],'&deg;C'],
        'minima-temp-2': [data.minimaCorrectionTable.temps[2],'&deg;C'],
        'minima-temp-3': [data.minimaCorrectionTable.temps[3],'&deg;C'],
        'minima-temp-4': [data.minimaCorrectionTable.temps[4],'&deg;C'],
        'minima-alt-0': [data.minimaCorrectionTable.altitudes[0], 'ft'],
        'minima-alt-1': [data.minimaCorrectionTable.altitudes[1], 'ft'],
        'minima-alt-2': [data.minimaCorrectionTable.altitudes[2], 'ft'],
        'minima-alt-3': [data.minimaCorrectionTable.altitudes[3], 'ft'],
        'minima-alt-4': [data.minimaCorrectionTable.altitudes[4], 'ft'],
        'minima-alt-5': [data.minimaCorrectionTable.altitudes[5], 'ft'],
        'minima-alt-6': [data.minimaCorrectionTable.altitudes[6], 'ft'],
        'minima-alt-7': [data.minimaCorrectionTable.altitudes[7], 'ft'],
        'minima-alt-8': [data.minimaCorrectionTable.altitudes[8], 'ft'],
        'minima-alt-9': [data.minimaCorrectionTable.altitudes[9], 'ft'],
        'minima-alt-10': [data.minimaCorrectionTable.altitudes[10], 'ft'],
        'minima-alt-11': [data.minimaCorrectionTable.altitudes[11], 'ft'],
        'minima-alt-12': [data.minimaCorrectionTable.altitudes[12], 'ft'],
        'minima-alt-13': [data.minimaCorrectionTable.altitudes[13], 'ft'],
        'minima-alt-14': [data.minimaCorrectionTable.altitudes[14], 'ft'],
        'minima-corr-0-0': [data.minimaCorrectionTable.values[0][0],'ft'],
        'minima-corr-1-0': [data.minimaCorrectionTable.values[1][0],'ft'],
        'minima-corr-2-0': [data.minimaCorrectionTable.values[2][0],'ft'],
        'minima-corr-3-0': [data.minimaCorrectionTable.values[3][0],'ft'],
        'minima-corr-4-0': [data.minimaCorrectionTable.values[4][0],'ft'],
        'minima-corr-5-0': [data.minimaCorrectionTable.values[5][0],'ft'],
        'minima-corr-6-0': [data.minimaCorrectionTable.values[6][0],'ft'],
        'minima-corr-7-0': [data.minimaCorrectionTable.values[7][0],'ft'],
        'minima-corr-8-0': [data.minimaCorrectionTable.values[8][0],'ft'],
        'minima-corr-9-0': [data.minimaCorrectionTable.values[9][0],'ft'],
        'minima-corr-10-0': [data.minimaCorrectionTable.values[10][0],'ft'],
        'minima-corr-11-0': [data.minimaCorrectionTable.values[11][0],'ft'],
        'minima-corr-12-0': [data.minimaCorrectionTable.values[12][0],'ft'],
        'minima-corr-13-0': [data.minimaCorrectionTable.values[13][0],'ft'],
        'minima-corr-14-0': [data.minimaCorrectionTable.values[14][0],'ft'],
        'minima-corr-0-1': [data.minimaCorrectionTable.values[0][1],'ft'],
        'minima-corr-1-1': [data.minimaCorrectionTable.values[1][1],'ft'],
        'minima-corr-2-1': [data.minimaCorrectionTable.values[2][1],'ft'],
        'minima-corr-3-1': [data.minimaCorrectionTable.values[3][1],'ft'],
        'minima-corr-4-1': [data.minimaCorrectionTable.values[4][1],'ft'],
        'minima-corr-5-1': [data.minimaCorrectionTable.values[5][1],'ft'],
        'minima-corr-6-1': [data.minimaCorrectionTable.values[6][1],'ft'],
        'minima-corr-7-1': [data.minimaCorrectionTable.values[7][1],'ft'],
        'minima-corr-8-1': [data.minimaCorrectionTable.values[8][1],'ft'],
        'minima-corr-9-1': [data.minimaCorrectionTable.values[9][1],'ft'],
        'minima-corr-10-1': [data.minimaCorrectionTable.values[10][1],'ft'],
        'minima-corr-11-1': [data.minimaCorrectionTable.values[11][1],'ft'],
        'minima-corr-12-1': [data.minimaCorrectionTable.values[12][1],'ft'],
        'minima-corr-13-1': [data.minimaCorrectionTable.values[13][1],'ft'],
        'minima-corr-14-1': [data.minimaCorrectionTable.values[14][1],'ft'],
        'minima-corr-0-2': [data.minimaCorrectionTable.values[0][2],'ft'],
        'minima-corr-1-2': [data.minimaCorrectionTable.values[1][2],'ft'],
        'minima-corr-2-2': [data.minimaCorrectionTable.values[2][2],'ft'],
        'minima-corr-3-2': [data.minimaCorrectionTable.values[3][2],'ft'],
        'minima-corr-4-2': [data.minimaCorrectionTable.values[4][2],'ft'],
        'minima-corr-5-2': [data.minimaCorrectionTable.values[5][2],'ft'],
        'minima-corr-6-2': [data.minimaCorrectionTable.values[6][2],'ft'],
        'minima-corr-7-2': [data.minimaCorrectionTable.values[7][2],'ft'],
        'minima-corr-8-2': [data.minimaCorrectionTable.values[8][2],'ft'],
        'minima-corr-9-2': [data.minimaCorrectionTable.values[9][2],'ft'],
        'minima-corr-10-2': [data.minimaCorrectionTable.values[10][2],'ft'],
        'minima-corr-11-2': [data.minimaCorrectionTable.values[11][2],'ft'],
        'minima-corr-12-2': [data.minimaCorrectionTable.values[12][2],'ft'],
        'minima-corr-13-2': [data.minimaCorrectionTable.values[13][2],'ft'],
        'minima-corr-14-2': [data.minimaCorrectionTable.values[14][2],'ft'],
        'minima-corr-0-3': [data.minimaCorrectionTable.values[0][3],'ft'],
        'minima-corr-1-3': [data.minimaCorrectionTable.values[1][3],'ft'],
        'minima-corr-2-3': [data.minimaCorrectionTable.values[2][3],'ft'],
        'minima-corr-3-3': [data.minimaCorrectionTable.values[3][3],'ft'],
        'minima-corr-4-3': [data.minimaCorrectionTable.values[4][3],'ft'],
        'minima-corr-5-3': [data.minimaCorrectionTable.values[5][3],'ft'],
        'minima-corr-6-3': [data.minimaCorrectionTable.values[6][3],'ft'],
        'minima-corr-7-3': [data.minimaCorrectionTable.values[7][3],'ft'],
        'minima-corr-8-3': [data.minimaCorrectionTable.values[8][3],'ft'],
        'minima-corr-9-3': [data.minimaCorrectionTable.values[9][3],'ft'],
        'minima-corr-10-3': [data.minimaCorrectionTable.values[10][3],'ft'],
        'minima-corr-11-3': [data.minimaCorrectionTable.values[11][3],'ft'],
        'minima-corr-12-3': [data.minimaCorrectionTable.values[12][3],'ft'],
        'minima-corr-13-3': [data.minimaCorrectionTable.values[13][3],'ft'],
        'minima-corr-14-3': [data.minimaCorrectionTable.values[14][3],'ft'],
        'minima-corr-0-4': [data.minimaCorrectionTable.values[0][4],'ft'],
        'minima-corr-1-4': [data.minimaCorrectionTable.values[1][4],'ft'],
        'minima-corr-2-4': [data.minimaCorrectionTable.values[2][4],'ft'],
        'minima-corr-3-4': [data.minimaCorrectionTable.values[3][4],'ft'],
        'minima-corr-4-4': [data.minimaCorrectionTable.values[4][4],'ft'],
        'minima-corr-5-4': [data.minimaCorrectionTable.values[5][4],'ft'],
        'minima-corr-6-4': [data.minimaCorrectionTable.values[6][4],'ft'],
        'minima-corr-7-4': [data.minimaCorrectionTable.values[7][4],'ft'],
        'minima-corr-8-4': [data.minimaCorrectionTable.values[8][4],'ft'],
        'minima-corr-9-4': [data.minimaCorrectionTable.values[9][4],'ft'],
        'minima-corr-10-4': [data.minimaCorrectionTable.values[10][4],'ft'],
        'minima-corr-11-4': [data.minimaCorrectionTable.values[11][4],'ft'],
        'minima-corr-12-4': [data.minimaCorrectionTable.values[12][4],'ft'],
        'minima-corr-13-4': [data.minimaCorrectionTable.values[13][4],'ft'],
        'minima-corr-14-4': [data.minimaCorrectionTable.values[14][4],'ft'],

        //CLIMB PERFORMANCE OUTPUTS
        // ROC Vy
        'roc-vy-w1-alt1-temp1': [Math.floor(data.rocVy.data['1D1'][ROCVyTemperatures[0]+'-raw'][0]), 'fpm'],
        'roc-vy-w1-alt1-temp2': [Math.floor(data.rocVy.data['1D1'][ROCVyTemperatures[1]+'-raw'][0]), 'fpm'],
        'roc-vy-w1-alt2-temp1': [Math.floor(data.rocVy.data['1D1'][ROCVyTemperatures[0]+'-raw'][1]), 'fpm'],
        'roc-vy-w1-alt2-temp2': [Math.floor(data.rocVy.data['1D1'][ROCVyTemperatures[1]+'-raw'][1]), 'fpm'],
        'roc-vy-w1-alt3-temp1': [Math.floor(data.rocVy.data['1D1'][ROCVyTemperatures[0]]), 'fpm'],
        'roc-vy-w1-alt3-temp2': [Math.floor(data.rocVy.data['1D1'][ROCVyTemperatures[1]]), 'fpm'],
        'roc-vy-w1-alt3-temp3': [Math.floor(data.rocVy.data['2D'][weights[0]]), 'fpm'],

        'roc-vy-w2-alt1-temp1': [Math.floor(data.rocVy.data['1D2'][ROCVyTemperatures[0]+'-raw'][0]), 'fpm'],
        'roc-vy-w2-alt1-temp2': [Math.floor(data.rocVy.data['1D2'][ROCVyTemperatures[1]+'-raw'][0]), 'fpm'],
        'roc-vy-w2-alt2-temp1': [Math.floor(data.rocVy.data['1D2'][ROCVyTemperatures[0]+'-raw'][1]), 'fpm'],
        'roc-vy-w2-alt2-temp2': [Math.floor(data.rocVy.data['1D2'][ROCVyTemperatures[1]+'-raw'][1]), 'fpm'],
        'roc-vy-w2-alt3-temp1': [Math.floor(data.rocVy.data['1D2'][ROCVyTemperatures[0]]), 'fpm'],
        'roc-vy-w2-alt3-temp2': [Math.floor(data.rocVy.data['1D2'][ROCVyTemperatures[1]]), 'fpm'],
        'roc-vy-w2-alt3-temp3': [Math.floor(data.rocVy.data['2D'][weights[1]]), 'fpm'],

        'roc-vy-w3-alt3-temp3': [Math.floor(data.rocVy.data['3D']['result']), 'fpm'],
        
        // OEI ROC VySE
        'oei-roc-vyse-w1-alt1-temp1': [Math.floor(data.rocVySe.data['1D1'][ROCVySeTemperatures[0]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w1-alt1-temp2': [Math.floor(data.rocVySe.data['1D1'][ROCVySeTemperatures[1]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w1-alt2-temp1': [Math.floor(data.rocVySe.data['1D1'][ROCVySeTemperatures[0]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w1-alt2-temp2': [Math.floor(data.rocVySe.data['1D1'][ROCVySeTemperatures[1]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w1-alt3-temp1': [Math.floor(data.rocVySe.data['1D1'][ROCVySeTemperatures[0]]), 'fpm'],
        'oei-roc-vyse-w1-alt3-temp2': [Math.floor(data.rocVySe.data['1D1'][ROCVySeTemperatures[1]]), 'fpm'],
        'oei-roc-vyse-w1-alt3-temp3': [Math.floor(data.rocVySe.data['2D'][weights[0]]), 'fpm'],

        'oei-roc-vyse-w2-alt1-temp1': [Math.floor(data.rocVySe.data['1D2'][ROCVySeTemperatures[0]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w2-alt1-temp2': [Math.floor(data.rocVySe.data['1D2'][ROCVySeTemperatures[1]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w2-alt2-temp1': [Math.floor(data.rocVySe.data['1D2'][ROCVySeTemperatures[0]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w2-alt2-temp2': [Math.floor(data.rocVySe.data['1D2'][ROCVySeTemperatures[1]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w2-alt3-temp1': [Math.floor(data.rocVySe.data['1D2'][ROCVySeTemperatures[0]]), 'fpm'],
        'oei-roc-vyse-w2-alt3-temp2': [Math.floor(data.rocVySe.data['1D2'][ROCVySeTemperatures[1]]), 'fpm'],
        'oei-roc-vyse-w2-alt3-temp3': [Math.floor(data.rocVySe.data['2D'][weights[1]]), 'fpm'],

        'oei-roc-vyse-w3-alt3-temp3': [Math.floor(data.rocVySe.data['3D']['result']), 'fpm'],


        // OEI Service Ceiling
        'oei-service-ceiling-alt1-alt': [Math.round(data.OEIserviceCeiling.data[0][0]), 'ft'],
        'oei-service-ceiling-alt1-roc': [Math.floor(data.OEIserviceCeiling.data[0][1]), 'fpm'],
        'oei-service-ceiling-alt2-alt': [Math.round(data.OEIserviceCeiling.data[1][0]), 'ft'],
        'oei-service-ceiling-alt2-roc': [Math.floor(data.OEIserviceCeiling.data[1][1]), 'fpm'],
        'oei-service-ceiling-alt3-alt': [Math.round(data.OEIserviceCeiling.data[2][0]), 'ft'],
        'oei-service-ceiling-alt3-roc': [Math.floor(data.OEIserviceCeiling.data[2][1]), 'fpm'],
        'oei-service-ceiling-alt4-alt': [Math.round(data.OEIserviceCeiling.data[3][0]), 'ft'],
        'oei-service-ceiling-alt4-roc': [Math.floor(data.OEIserviceCeiling.data[3][1]), 'fpm'],
        'oei-service-ceiling-alt5-alt': [Math.round(data.OEIserviceCeiling.data[4][0]), 'ft'],
        'oei-service-ceiling-alt5-roc': [Math.floor(data.OEIserviceCeiling.data[4][1]), 'fpm'],

        'service-ceiling-pressure-alt': [data.OEIserviceCeiling.pressureCeiling, 'ft'],
        'service-ceiling-pressure-correction': [data.OEIserviceCeiling.pressureCorrection > 0 ? '+'+ data.OEIserviceCeiling.pressureCorrection : data.OEIserviceCeiling.pressureCorrection, 'ft'],
        'service-ceiling-true-alt': [data.OEIserviceCeiling.ceiling, 'ft'],

        // OEI Service Ceiling - ROC
        'service-ceiling-roc-w1-alt1-temp1': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D1'][ceilingTemperatures[1]+'-raw'][0]), 'fpm'],
        'service-ceiling-roc-w1-alt1-temp2': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D1'][ceilingTemperatures[0]+'-raw'][0]), 'fpm'],
        'service-ceiling-roc-w1-alt2-temp1': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D1'][ceilingTemperatures[1]+'-raw'][1]), 'fpm'],
        'service-ceiling-roc-w1-alt2-temp2': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D1'][ceilingTemperatures[0]+'-raw'][1]), 'fpm'],
        'service-ceiling-roc-w1-alt3-temp1': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D1'][ceilingTemperatures[1]]), 'fpm'],
        'service-ceiling-roc-w1-alt3-temp2': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D1'][ceilingTemperatures[0]]), 'fpm'],
        'service-ceiling-roc-w1-alt3-temp3': [Math.floor(data.OEIserviceCeiling.data[2][2].data['2D'][weights[0]]), 'fpm'],

        'service-ceiling-roc-w2-alt1-temp1': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D2'][ceilingTemperatures[1]+'-raw'][0]), 'fpm'],
        'service-ceiling-roc-w2-alt1-temp2': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D2'][ceilingTemperatures[0]+'-raw'][0]), 'fpm'],
        'service-ceiling-roc-w2-alt2-temp1': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D2'][ceilingTemperatures[1]+'-raw'][1]), 'fpm'],
        'service-ceiling-roc-w2-alt2-temp2': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D2'][ceilingTemperatures[0]+'-raw'][1]), 'fpm'],
        'service-ceiling-roc-w2-alt3-temp1': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D2'][ceilingTemperatures[1]]), 'fpm'],
        'service-ceiling-roc-w2-alt3-temp2': [Math.floor(data.OEIserviceCeiling.data[2][2].data['1D2'][ceilingTemperatures[0]]), 'fpm'],
        'service-ceiling-roc-w2-alt3-temp3': [Math.floor(data.OEIserviceCeiling.data[2][2].data['2D'][weights[1]]), 'fpm'],

        'service-ceiling-roc-w3-alt3-temp3': [Math.floor(data.OEIserviceCeiling.data[2][2].data['3D']['result']), 'fpm'],

        //Fuel Consumption
        'FC-pa1-rpm1-temp1-map1': [Math.ceil(data.FuelConsumption.data["1D1"][data.FuelConsumption.keys.temp1+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa1-rpm1-temp1-map2': [Math.ceil(data.FuelConsumption.data["1D1"][data.FuelConsumption.keys.temp1+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa1-rpm1-temp1-map3': [Math.ceil(data.FuelConsumption.data["1D1"][data.FuelConsumption.keys.temp1]*10)/10,'lt/h'],
        'FC-pa1-rpm1-temp2-map1': [Math.ceil(data.FuelConsumption.data["1D1"][data.FuelConsumption.keys.temp2+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa1-rpm1-temp2-map2': [Math.ceil(data.FuelConsumption.data["1D1"][data.FuelConsumption.keys.temp2+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa1-rpm1-temp2-map3': [Math.ceil(data.FuelConsumption.data["1D1"][data.FuelConsumption.keys.temp2]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp1-map1': [Math.ceil(data.FuelConsumption.data["1D2"][data.FuelConsumption.keys.temp1+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp1-map2': [Math.ceil(data.FuelConsumption.data["1D2"][data.FuelConsumption.keys.temp1+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp1-map3': [Math.ceil(data.FuelConsumption.data["1D2"][data.FuelConsumption.keys.temp1]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp2-map1': [Math.ceil(data.FuelConsumption.data["1D2"][data.FuelConsumption.keys.temp2+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp2-map2': [Math.ceil(data.FuelConsumption.data["1D2"][data.FuelConsumption.keys.temp2+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp2-map3': [Math.ceil(data.FuelConsumption.data["1D2"][data.FuelConsumption.keys.temp2]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp1-map1': [Math.ceil(data.FuelConsumption.data["1D3"][data.FuelConsumption.keys.temp1+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp1-map2': [Math.ceil(data.FuelConsumption.data["1D3"][data.FuelConsumption.keys.temp1+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp1-map3': [Math.ceil(data.FuelConsumption.data["1D3"][data.FuelConsumption.keys.temp1]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp2-map1': [Math.ceil(data.FuelConsumption.data["1D3"][data.FuelConsumption.keys.temp2+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp2-map2': [Math.ceil(data.FuelConsumption.data["1D3"][data.FuelConsumption.keys.temp2+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp2-map3': [Math.ceil(data.FuelConsumption.data["1D3"][data.FuelConsumption.keys.temp2]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp1-map1': [Math.ceil(data.FuelConsumption.data["1D4"][data.FuelConsumption.keys.temp1+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp1-map2': [Math.ceil(data.FuelConsumption.data["1D4"][data.FuelConsumption.keys.temp1+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp1-map3': [Math.ceil(data.FuelConsumption.data["1D4"][data.FuelConsumption.keys.temp1]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp2-map1': [Math.ceil(data.FuelConsumption.data["1D4"][data.FuelConsumption.keys.temp2+'-raw'][0]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp2-map2': [Math.ceil(data.FuelConsumption.data["1D4"][data.FuelConsumption.keys.temp2+'-raw'][1]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp2-map3': [Math.ceil(data.FuelConsumption.data["1D4"][data.FuelConsumption.keys.temp2]*10)/10,'lt/h'],

        'FC-pa1-rpm1-temp3-map3': [Math.ceil(data.FuelConsumption.data["2D1"][data.FuelConsumption.keys.RPM1]*10)/10,'lt/h'],
        'FC-pa1-rpm2-temp3-map3': [Math.ceil(data.FuelConsumption.data["2D1"][data.FuelConsumption.keys.RPM2]*10)/10,'lt/h'],
        'FC-pa2-rpm1-temp3-map3': [Math.ceil(data.FuelConsumption.data["2D2"][data.FuelConsumption.keys.RPM1]*10)/10,'lt/h'],
        'FC-pa2-rpm2-temp3-map3': [Math.ceil(data.FuelConsumption.data["2D2"][data.FuelConsumption.keys.RPM2]*10)/10,'lt/h'],

        'FC-pa1-rpm3-temp3-map3': [Math.ceil(data.FuelConsumption.data["3D"][data.FuelConsumption.keys.alt1]*10)/10,'lt/h'],
        'FC-pa2-rpm3-temp3-map3': [Math.ceil(data.FuelConsumption.data["3D"][data.FuelConsumption.keys.alt2]*10)/10,'lt/h'],
        
        'FC-pa3-rpm3-temp3-map3': [Math.ceil(data.FuelConsumption.result*10)/10,'lt/h'],

        //KTAS
        'KTAS-pa1-rpm1-temp1-map1': [Math.ceil(data.KTAS.data["1D1"][data.KTAS.keys.temp1+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa1-rpm1-temp1-map2': [Math.ceil(data.KTAS.data["1D1"][data.KTAS.keys.temp1+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa1-rpm1-temp1-map3': [Math.ceil(data.KTAS.data["1D1"][data.KTAS.keys.temp1]*10)/10,'kts'],
        'KTAS-pa1-rpm1-temp2-map1': [Math.ceil(data.KTAS.data["1D1"][data.KTAS.keys.temp2+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa1-rpm1-temp2-map2': [Math.ceil(data.KTAS.data["1D1"][data.KTAS.keys.temp2+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa1-rpm1-temp2-map3': [Math.ceil(data.KTAS.data["1D1"][data.KTAS.keys.temp2]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp1-map1': [Math.ceil(data.KTAS.data["1D2"][data.KTAS.keys.temp1+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp1-map2': [Math.ceil(data.KTAS.data["1D2"][data.KTAS.keys.temp1+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp1-map3': [Math.ceil(data.KTAS.data["1D2"][data.KTAS.keys.temp1]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp2-map1': [Math.ceil(data.KTAS.data["1D2"][data.KTAS.keys.temp2+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp2-map2': [Math.ceil(data.KTAS.data["1D2"][data.KTAS.keys.temp2+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp2-map3': [Math.ceil(data.KTAS.data["1D2"][data.KTAS.keys.temp2]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp1-map1': [Math.ceil(data.KTAS.data["1D3"][data.KTAS.keys.temp1+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp1-map2': [Math.ceil(data.KTAS.data["1D3"][data.KTAS.keys.temp1+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp1-map3': [Math.ceil(data.KTAS.data["1D3"][data.KTAS.keys.temp1]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp2-map1': [Math.ceil(data.KTAS.data["1D3"][data.KTAS.keys.temp2+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp2-map2': [Math.ceil(data.KTAS.data["1D3"][data.KTAS.keys.temp2+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp2-map3': [Math.ceil(data.KTAS.data["1D3"][data.KTAS.keys.temp2]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp1-map1': [Math.ceil(data.KTAS.data["1D4"][data.KTAS.keys.temp1+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp1-map2': [Math.ceil(data.KTAS.data["1D4"][data.KTAS.keys.temp1+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp1-map3': [Math.ceil(data.KTAS.data["1D4"][data.KTAS.keys.temp1]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp2-map1': [Math.ceil(data.KTAS.data["1D4"][data.KTAS.keys.temp2+'-raw'][0]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp2-map2': [Math.ceil(data.KTAS.data["1D4"][data.KTAS.keys.temp2+'-raw'][1]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp2-map3': [Math.ceil(data.KTAS.data["1D4"][data.KTAS.keys.temp2]*10)/10,'kts'],

        'KTAS-pa1-rpm1-temp3-map3': [Math.ceil(data.KTAS.data["2D1"][data.KTAS.keys.RPM1]*10)/10,'kts'],
        'KTAS-pa1-rpm2-temp3-map3': [Math.ceil(data.KTAS.data["2D1"][data.KTAS.keys.RPM2]*10)/10,'kts'],
        'KTAS-pa2-rpm1-temp3-map3': [Math.ceil(data.KTAS.data["2D2"][data.KTAS.keys.RPM1]*10)/10,'kts'],
        'KTAS-pa2-rpm2-temp3-map3': [Math.ceil(data.KTAS.data["2D2"][data.KTAS.keys.RPM2]*10)/10,'kts'],

        'KTAS-pa1-rpm3-temp3-map3': [Math.ceil(data.KTAS.data["3D"][data.KTAS.keys.alt1]*10)/10,'kts'],
        'KTAS-pa2-rpm3-temp3-map3': [Math.ceil(data.KTAS.data["3D"][data.KTAS.keys.alt2]*10)/10,'kts'],
        
        'KTAS-pa3-rpm3-temp3-map3': [Math.ceil(data.KTAS.result*10)/10,'kts'],

        //Power Setting
        'PWR-pa1-rpm1-temp1-map1': [Math.ceil(data.Powersetting.data["1D1"][data.Powersetting.keys.temp1+'-raw'][0]*10)/10,'%'],
        'PWR-pa1-rpm1-temp1-map2': [Math.ceil(data.Powersetting.data["1D1"][data.Powersetting.keys.temp1+'-raw'][1]*10)/10,'%'],
        'PWR-pa1-rpm1-temp1-map3': [Math.ceil(data.Powersetting.data["1D1"][data.Powersetting.keys.temp1]*10)/10,'%'],
        'PWR-pa1-rpm1-temp2-map1': [Math.ceil(data.Powersetting.data["1D1"][data.Powersetting.keys.temp2+'-raw'][0]*10)/10,'%'],
        'PWR-pa1-rpm1-temp2-map2': [Math.ceil(data.Powersetting.data["1D1"][data.Powersetting.keys.temp2+'-raw'][1]*10)/10,'%'],
        'PWR-pa1-rpm1-temp2-map3': [Math.ceil(data.Powersetting.data["1D1"][data.Powersetting.keys.temp2]*10)/10,'%'],
        'PWR-pa1-rpm2-temp1-map1': [Math.ceil(data.Powersetting.data["1D2"][data.Powersetting.keys.temp1+'-raw'][0]*10)/10,'%'],
        'PWR-pa1-rpm2-temp1-map2': [Math.ceil(data.Powersetting.data["1D2"][data.Powersetting.keys.temp1+'-raw'][1]*10)/10,'%'],
        'PWR-pa1-rpm2-temp1-map3': [Math.ceil(data.Powersetting.data["1D2"][data.Powersetting.keys.temp1]*10)/10,'%'],
        'PWR-pa1-rpm2-temp2-map1': [Math.ceil(data.Powersetting.data["1D2"][data.Powersetting.keys.temp2+'-raw'][0]*10)/10,'%'],
        'PWR-pa1-rpm2-temp2-map2': [Math.ceil(data.Powersetting.data["1D2"][data.Powersetting.keys.temp2+'-raw'][1]*10)/10,'%'],
        'PWR-pa1-rpm2-temp2-map3': [Math.ceil(data.Powersetting.data["1D2"][data.Powersetting.keys.temp2]*10)/10,'%'],
        'PWR-pa2-rpm1-temp1-map1': [Math.ceil(data.Powersetting.data["1D3"][data.Powersetting.keys.temp1+'-raw'][0]*10)/10,'%'],
        'PWR-pa2-rpm1-temp1-map2': [Math.ceil(data.Powersetting.data["1D3"][data.Powersetting.keys.temp1+'-raw'][1]*10)/10,'%'],
        'PWR-pa2-rpm1-temp1-map3': [Math.ceil(data.Powersetting.data["1D3"][data.Powersetting.keys.temp1]*10)/10,'%'],
        'PWR-pa2-rpm1-temp2-map1': [Math.ceil(data.Powersetting.data["1D3"][data.Powersetting.keys.temp2+'-raw'][0]*10)/10,'%'],
        'PWR-pa2-rpm1-temp2-map2': [Math.ceil(data.Powersetting.data["1D3"][data.Powersetting.keys.temp2+'-raw'][1]*10)/10,'%'],
        'PWR-pa2-rpm1-temp2-map3': [Math.ceil(data.Powersetting.data["1D3"][data.Powersetting.keys.temp2]*10)/10,'%'],
        'PWR-pa2-rpm2-temp1-map1': [Math.ceil(data.Powersetting.data["1D4"][data.Powersetting.keys.temp1+'-raw'][0]*10)/10,'%'],
        'PWR-pa2-rpm2-temp1-map2': [Math.ceil(data.Powersetting.data["1D4"][data.Powersetting.keys.temp1+'-raw'][1]*10)/10,'%'],
        'PWR-pa2-rpm2-temp1-map3': [Math.ceil(data.Powersetting.data["1D4"][data.Powersetting.keys.temp1]*10)/10,'%'],
        'PWR-pa2-rpm2-temp2-map1': [Math.ceil(data.Powersetting.data["1D4"][data.Powersetting.keys.temp2+'-raw'][0]*10)/10,'%'],
        'PWR-pa2-rpm2-temp2-map2': [Math.ceil(data.Powersetting.data["1D4"][data.Powersetting.keys.temp2+'-raw'][1]*10)/10,'%'],
        'PWR-pa2-rpm2-temp2-map3': [Math.ceil(data.Powersetting.data["1D4"][data.Powersetting.keys.temp2]*10)/10,'%'],

        'PWR-pa1-rpm1-temp3-map3': [Math.ceil(data.Powersetting.data["2D1"][data.Powersetting.keys.RPM1]*10)/10,'%'],
        'PWR-pa1-rpm2-temp3-map3': [Math.ceil(data.Powersetting.data["2D1"][data.Powersetting.keys.RPM2]*10)/10,'%'],
        'PWR-pa2-rpm1-temp3-map3': [Math.ceil(data.Powersetting.data["2D2"][data.Powersetting.keys.RPM1]*10)/10,'%'],
        'PWR-pa2-rpm2-temp3-map3': [Math.ceil(data.Powersetting.data["2D2"][data.Powersetting.keys.RPM2]*10)/10,'%'],

        'PWR-pa1-rpm3-temp3-map3': [Math.ceil(data.Powersetting.data["3D"][data.Powersetting.keys.alt1]*10)/10,'%'],
        'PWR-pa2-rpm3-temp3-map3': [Math.ceil(data.Powersetting.data["3D"][data.Powersetting.keys.alt2]*10)/10,'%'],
        
        'PWR-pa3-rpm3-temp3-map3': [Math.ceil(data.Powersetting.result*10)/10,'%'],

    };
    
    updateUIValues(takeOffLandingUIPairs);
    // console.log(data.rocVySe.data);


    /**********************
     * Show applicable corrections only
     **********************/

    $('.correction-wind-row,.to-correction-wind-equation,.ldg-correction-wind-equation,.asdr-wind-correction-equation').hide();
    $('.correction-soft-rwy-row,.to-correction-soft-equation,.ldg-correction-soft-equation').hide();
    $('.correction-sloped-rwy-row,.to-correction-slope-equation,.ldg-correction-slope-equation').hide();
    $('.correction-paved-rwy-row,.to-correction-paved-equation,.ldg-correction-paved-equation').hide();
    $('.correction-inc-spd-row').hide();

    if (useWindComponent) {
        $('.correction-wind-row,.to-correction-wind-equation,.ldg-correction-wind-equation,.asdr-wind-correction-equation').show();
    }

    if (useSoftSfc) {
        $('.correction-soft-rwy-row,.to-correction-soft-equation,.ldg-correction-soft-equation').show();
    }

    if (useSlope) {
        $('.correction-sloped-rwy-row,.to-correction-slope-equation,.ldg-correction-slope-equation').show();
    }

    if (usePavedRWY) {
        $('.correction-paved-rwy-row,.to-correction-paved-equation,.ldg-correction-paved-equation').show();
    }

    if (useIncreasedAppSpeed) {
        $('.correction-inc-spd-row').show();
    }

    /**********************
     * Math Jax Equations *
     **********************/

    //Enviromental
    $('.env-pressure-correction-equation').html(MathJax.tex2svg('('+STD_PRESSURE+'hPa - '+pressureInput+'hPa) \\cdot '+STD_HECTOPASCAL_HEIGHT+' \\tfrac{ft}{hPa} = '+getPressureCorrection()*-1+'ft'));

    var pc = '+0'

    if (getPressureCorrection()*-1 >= 0){
        pc = '+'+(getPressureCorrection()*-1)+'ft'
    }
    else {
        pc = '-'+getPressureCorrection()+'ft'
    }

    //Enviromental
    $('.env-pressure-elevation-equation').html(MathJax.tex2svg(''+elevationInput+'ft'+pc+'='+pressureElevation+'ft'));
    $('.env-pressure-altitude-cruise-equation').html(MathJax.tex2svg(''+cruiseInput+'ft'+pc+'='+pressureAltitude+'ft'));
    //the following equations is not used, but also not correct
    $('.env-true-altitude-roc-equation').html(MathJax.tex2svg('('+pressureAltitude+'ft - '+pressureElevation+'ft) \\cdot \\frac{2}{3} + '+pressureElevation+'ft = '+rocPressureAlt+''));
    $('.env-pressure-altitude-roc-equation').html(MathJax.tex2svg(''+Math.ceil(rocAltitude)+'ft'+pc+'='+Math.ceil(rocPressureAlt)+'ft'));
    $('.env-headwind-component-equation').html(MathJax.tex2svg('cos( '+rwyDirInput+'^ \\circ -'+windDirInput+'^\\circ ) \\cdot '+windSpdInput+'kts = '+Math.abs(getWindComponents().head)+'kts'));
    $('.env-crosswind-component-equation').html(MathJax.tex2svg('sin( '+rwyDirInput+'^ \\circ -'+windDirInput+'^\\circ ) \\cdot '+windSpdInput+'kts = '+Math.abs(getWindComponents().cross)+'kts'));

    //Takeoff Groundroll
    //Interpolation between altitudes for mass1, temp1&2
    $('.to-g-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-g-w1-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-g-w1-alt3-temp1'][0] +'m', {display: true}));
    $('.to-g-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-g-w1-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['to-g-w1-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass1
    $('.to-g-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['to-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['to-g-w1-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-g-w1-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.to-g-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-g-w2-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-g-w2-alt3-temp1'][0] +'m', {display: true}));
    $('.to-g-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-g-w2-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['to-g-w2-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass2
    $('.to-g-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['to-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['to-g-w2-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between masses
    $('.to-g-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['to-mass2'][0] +'kg - '+ takeOffLandingUIPairs['to-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['to-mass3'][0] +'kg - '+ takeOffLandingUIPairs['to-mass1'][0] +'kg) + '+ takeOffLandingUIPairs['to-g-w1-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0] +'m', {display: true}));

    //Takeoff Distance
    //Interpolation between altitudes for mass1, temp1&2
    $('.to-d-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w1-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['to-d-w1-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-d-w1-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-d-w1-alt3-temp1'][0] +'m', {display: true}));
    $('.to-d-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w1-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-d-w1-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-d-w1-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['to-d-w1-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass1
    $('.to-d-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w1-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-d-w1-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['to-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['to-d-w1-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-d-w1-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.to-d-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w2-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['to-d-w2-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-d-w2-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-d-w2-alt3-temp1'][0] +'m', {display: true}));
    $('.to-d-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w2-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-d-w2-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][0] +'ft - '+ takeOffLandingUIPairs['to-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['to-d-w2-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['to-d-w2-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass2
    $('.to-d-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w2-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['to-d-w2-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['to-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['to-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['to-d-w2-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['to-d-w2-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between masses
    $('.to-d-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w2-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['to-d-w1-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['to-mass2'][0] +'kg - '+ takeOffLandingUIPairs['to-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['to-mass3'][0] +'kg - '+ takeOffLandingUIPairs['to-mass1'][0] +'kg) + '+ takeOffLandingUIPairs['to-d-w1-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['to-d-w3-alt3-temp3'][0] +'m', {display: true}));

    //Corrections
    $('.to-correction-paved-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m \\cdot -6\\% = '+ takeOffLandingUIPairs['to-corrections-paved-rwy'][0]+'m', {display: true}));
    $('.to-correction-slope-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m \\cdot ('+ (data.takeoff.corrections.slope * 100) +'\\%/1\\%) \\cdot 5\\% = '+ takeOffLandingUIPairs['to-corrections-sloped-rwy'][0]+'m', {display: true}));
    $('.to-correction-soft-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m \\cdot '+ ((useSoftSfc)?'\\25%' : '0\\%') +' = '+ takeOffLandingUIPairs['to-corrections-soft-rwy'][0]+'m', {display: true}));
    $('.to-correction-wind-equation').html(MathJax.tex2svg((getWindComponents().head>0 ? '-2.5\\tfrac{m}{kt} \\cdot '+ takeOffLandingUIPairs['env-headwind-component'][0] +'kts' : '10\\tfrac{m}{kt} \\cdot ' + takeOffLandingUIPairs['env-headwind-component'][0] + 'kts')+' = '+ takeOffLandingUIPairs['to-corrections-wind'][0]+'m', {display: true}));

    //Corrected
    $('.to-g-corrected-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m + '+ takeOffLandingUIPairs['to-corrections-combined'][0] +'m = '+ takeOffLandingUIPairs['to-g-corrected'][0]+'m', {display: true}));
    $('.to-d-corrected-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-d-w3-alt3-temp3'][0]+'m + '+ takeOffLandingUIPairs['to-corrections-combined'][0] +'m = '+ takeOffLandingUIPairs['to-d-corrected'][0]+'m', {display: true}));

    //Factorized
    $('.to-g-factorized-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-corrected'][0]+'m \\cdot 1.25 = '+ takeOffLandingUIPairs['to-g-final'][0]+'m', {display: true}));
    $('.to-d-factorized-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-d-corrected'][0]+'m \\cdot 1.25 = '+ takeOffLandingUIPairs['to-d-final'][0]+'m', {display: true}));

    //Landing Distance
    //Interpolation between altitudes for mass1, temp1&2
    $('.ldg-d-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w1-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w1-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-d-w1-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp1'][0] +'m', {display: true}));
    $('.ldg-d-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w1-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w1-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-d-w1-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass1
    $('.ldg-d-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['ldg-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.ldg-d-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w2-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w2-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-d-w2-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp1'][0] +'m', {display: true}));
    $('.ldg-d-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w2-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w2-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-d-w2-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass2
    $('.ldg-d-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['ldg-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between masses
    $('.ldg-d-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-mass2'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['ldg-mass3'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass1'][0] +'kg) + '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w3-alt3-temp3'][0] +'m', {display: true}));

    //Landing Groundroll
    //Interpolation between altitudes for mass1, temp1&2
    $('.ldg-g-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w1-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w1-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-g-w1-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp1'][0] +'m', {display: true}));
    $('.ldg-g-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w1-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w1-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-g-w1-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass1
    $('.ldg-g-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['ldg-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.ldg-g-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w2-alt2-temp1'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w2-alt1-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-g-w2-alt1-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp1'][0] +'m', {display: true}));
    $('.ldg-g-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w2-alt2-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w2-alt1-temp2'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-alt2'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['ldg-alt3'][0] +'ft - '+ takeOffLandingUIPairs['ldg-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['ldg-g-w2-alt1-temp2'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp2'][0] +'m', {display: true}));
    //Interpolation between temperatures for mass2
    $('.ldg-g-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp2'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp1'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['ldg-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['ldg-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp1'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp3'][0] +'m', {display: true}));
    //Interpolation between masses
    $('.ldg-g-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-mass2'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['ldg-mass3'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass1'][0] +'kg) + '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0] +'m', {display: true}));

    //Corrections
    $('.ldg-correction-paved-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m \\cdot -6\\% = '+ takeOffLandingUIPairs['ldg-corrections-paved-rwy'][0]+'m', {display: true}));
    $('.ldg-correction-slope-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m \\cdot ('+ (data.takeoff.corrections.slope * 100) +'\\%/1\\%) \\cdot 5\\% = '+ takeOffLandingUIPairs['ldg-corrections-sloped-rwy'][0]+'m', {display: true}));
    $('.ldg-correction-soft-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m \\cdot '+ ((useSoftSfc)?'\\25%' : '0\\%') +' = '+ takeOffLandingUIPairs['ldg-corrections-soft-rwy'][0]+'m', {display: true}));

    var roundedHeadWindComponent = Math.abs(getWindComponents().head);
    $('.ldg-correction-wind-equation').html(MathJax.tex2svg((getWindComponents().head>0 ? '-5\\tfrac{m}{kt} \\cdot '+ roundedHeadWindComponent +'kts' : '11\\tfrac{m}{kt} \\cdot ' + roundedHeadWindComponent + 'kts')+' = '+ takeOffLandingUIPairs['ldg-corrections-wind'][0]+'m', {display: true}));
    $('.ldg-correction-appSpeed-equation').html(MathJax.tex2svg('11 \\tfrac{m}{kt} \\cdot 10kts = 110m'));

    //Corrected
    $('.ldg-g-corrected-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m + '+ takeOffLandingUIPairs['ldg-corrections-combined'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-corrected'][0]+'m', {display: true}));
    $('.ldg-d-corrected-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-d-w3-alt3-temp3'][0]+'m + '+ takeOffLandingUIPairs['ldg-corrections-combined'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-corrected'][0]+'m', {display: true}));

    //Factorized
    $('.ldg-g-factorized-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-corrected'][0]+'m \\cdot 1.43 = '+ takeOffLandingUIPairs['ldg-g-final'][0]+'m', {display: true}));
    $('.ldg-d-factorized-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-d-corrected'][0]+'m \\cdot 1.43 = '+ takeOffLandingUIPairs['ldg-d-final'][0]+'m', {display: true}));


    // ASDR
    $('.asdr-groundroll-sum-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m +'+ takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m = '+ takeOffLandingUIPairs['asdr-uncorrected'][0]+ 'm'));
    $('.asdr-ldg-spd-equation').html(MathJax.tex2svg('-5\\tfrac{m}{kt} \\cdot 5 kts = -25 m'));
    $('.asdr-wind-correction-equation').html(MathJax.tex2svg((getWindComponents().head>0 ? '-2.5\\tfrac{m}{kt} \\cdot '+ takeOffLandingUIPairs['env-headwind-component'][0] +'kts' : '10\\tfrac{m}{kt} \\cdot ' + takeOffLandingUIPairs['env-headwind-component'][0] + 'kts')+' = '+ takeOffLandingUIPairs['to-corrections-wind'][0]+'m', {display: true}));
    $('.asdr-safety-factor-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['asdr-correction-sum-before-safety'][0] +'m \\cdot 1.25 = '+ takeOffLandingUIPairs['asdr-correction-sum-before-time'][0] +'m'));
    $('.asdr-time-correction-equation').html(MathJax.tex2svg('\\tfrac{65kts}{3600\\tfrac{s}{h}} \\cdot 3s \\cdot 1852\\tfrac{m}{nm} = '+ takeOffLandingUIPairs['asdr-correction-time-factor'][0] +'m'));


    //Temperature correction to Minima DA/MDA
    //$('.minima-temp-correction-general-equation').html(MathJax.tex2svg('correction = {-ISA deviaton \\over \\tfrac{1.98^\\circ C}{1000ft}} \\cdot \\ln\\left(1+{\\tfrac{1.98^\\circ C}{1000ft} \\cdot DH/MDH_{pa} \\over 273 ^\\circ _{C \\rightarrow K} + 15^\\circ C + \\tfrac{1.98^\\circ C}{1000ft} \\cdot Elevation_{pa} }\\right)', {display: true}));
    $('.minima-temp-correction-equation').html(MathJax.tex2svg('{'+tempIsaDeviation*-1+'^\\circ C \\over \\tfrac{1.98^\\circ C}{1000ft}} \\cdot \\ln\\left(1+{\\tfrac{1.98^\\circ C}{1000ft} \\cdot '+takeOffLandingUIPairs['minima-ph-uncorrected'][0]+'ft \\over 273 ^\\circ _{C \\rightarrow K} + 15^\\circ C + \\tfrac{1.98^\\circ C}{1000ft} \\cdot '+takeOffLandingUIPairs['env-elevation'][0]+'ft }\\right) = '+takeOffLandingUIPairs['tempCorrectionToMinima'][0]+'ft', {display: true}));
    $('.minima-temp-correction-summing-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['minima-uncorrected'][0]+'ft + '+takeOffLandingUIPairs['tempCorrectionToMinima'][0]+'ft = '+takeOffLandingUIPairs['minima-corrected'][0]+'ft', {display: true}));

    // WIP

/*
<li>First, the climbrates are interpolated between altitudes, for each temperature and weight:<br>
                    $$value_{actual} = {value_{low} - value_{high} \over altitude_{high} - altitude_{low}} \cdot (altitude_{high} - altitude_{actual})+value_{high}$$</li>
                <li>Then, the results of these formulas are interpolated between temperatures, for each weight:<br>
                    $$value_{actual} = {value_{cold} - value_{hot} \over temp_{hot} - temp_{cold}} \cdot (temp_{hot} - temp_{actual})+value_{hot}$$</li>
                <li>Finally, the result of those formulas are interpolated between weights:<br>
                    $$value_{actual} = {value_{light} - value_{heavy} \over mass_{heavy} - mass_{light}} \cdot (mass_{heavy} - mass_{actual})+value_{heavy}$$</li>
*/

    //RoC Vy
    //Interpolation between altitudes for mass1, temp1&2
    $('.roc-vy-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.roc-vy-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass1
    $('.roc-vy-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['roc-vy-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp3'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.roc-vy-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.roc-vy-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass2
    $('.roc-vy-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['roc-vy-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp3'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between mass
    $('.roc-vy-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-mass2'][0] +'kg - '+ takeOffLandingUIPairs['roc-vy-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['roc-vy-mass1'][0] +'kg - '+ takeOffLandingUIPairs['roc-vy-mass3'][0] +'kg) + '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));

    //Gradient Vy
    $('.gradient-vy-equation').html(MathJax.tex2svg('Gradient = \\frac{'+takeOffLandingUIPairs['roc-vy-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}}{'+ takeOffLandingUIPairs['vy'][0] +'kts \\cdot 6076 \\tfrac{ft}{nm} / 60 \\tfrac{min}{hour}} = '+takeOffLandingUIPairs['grad-vy'][0]+'\\%'));

    //OEI RoC VySe
    //Interpolation between altitudes for mass1, temp1&2
    $('.oei-roc-vyse-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.oei-roc-vyse-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass1
    $('.oei-roc-vyse-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp3'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.oei-roc-vyse-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.oei-roc-vyse-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass2
    $('.oei-roc-vyse-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp3'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between masses
    $('.oei-roc-vyse-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-mass2'][0] +'kg - '+ takeOffLandingUIPairs['oei-roc-vyse-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-mass1'][0] +'kg - '+ takeOffLandingUIPairs['oei-roc-vyse-mass3'][0] +'kg) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));

    //Gradient VySe
    $('.oei-gradient-vyse-equation').html(MathJax.tex2svg('Gradient = \\frac{'+takeOffLandingUIPairs['oei-roc-vyse-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}}{'+ takeOffLandingUIPairs['vyse'][0] +'kts \\cdot 6076 \\tfrac{ft}{nm} / 60 \\tfrac{min}{hour}} = '+takeOffLandingUIPairs['grad-vyse'][0]+'\\%'));

    //OEI Service Ceiling RoC
    //Interpolation between altitudes for mass1, temp1&2
    $('.service-ceiling-roc-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.service-ceiling-roc-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass1
    $('.service-ceiling-roc-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['service-ceiling-roc-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['service-ceiling-roc-temp3'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.service-ceiling-roc-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.service-ceiling-roc-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-alt2'][0] +'ft - '+ takeOffLandingUIPairs['service-ceiling-roc-alt3'][0] +'ft) + '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass2
    $('.service-ceiling-roc-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['service-ceiling-roc-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['service-ceiling-roc-temp3'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between masses
    $('.service-ceiling-roc-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['service-ceiling-roc-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['service-ceiling-roc-mass2'][0] +'kg - '+ takeOffLandingUIPairs['service-ceiling-roc-mass1'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['service-ceiling-roc-mass1'][0] +'kg - '+ takeOffLandingUIPairs['service-ceiling-roc-mass3'][0] +'kg) + '+ takeOffLandingUIPairs['service-ceiling-roc-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['service-ceiling-roc-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));

    //Fuel Consumption
    //Interpolation between MAP for alt1-rpm1-temp1&2
    //$('.FC-alt1-rpm1-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm1-temp1-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm1-temp1-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AA'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa1-rpm1-temp1-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm1-temp1-map3'][0]+'\\tfrac{lt}{h}'));
    //$('.FC-alt1-rpm1-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm1-temp2-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm1-temp2-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AA'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa1-rpm1-temp2-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm1-temp2-map3'][0]+'\\tfrac{lt}{h}'));
    //Interpolation between MAP for alt1-rpm2-temp1&2
    $('.FC-alt1-rpm2-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm2-temp1-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm2-temp1-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BA'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa1-rpm2-temp1-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm2-temp1-map3'][0]+'\\tfrac{lt}{h}'));
    $('.FC-alt1-rpm2-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm2-temp2-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm2-temp2-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BA'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa1-rpm2-temp2-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm2-temp2-map3'][0]+'\\tfrac{lt}{h}'));
    //Interpolation between MAP for alt2-rpm1-temp1&2
    //$('.FC-alt2-rpm1-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm1-temp1-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa2-rpm1-temp1-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AB'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa2-rpm1-temp1-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm1-temp1-map3'][0]+'\\tfrac{lt}{h}'));
    //$('.FC-alt2-rpm1-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm1-temp2-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa2-rpm1-temp2-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2AB'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1AB'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa2-rpm1-temp2-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm1-temp2-map3'][0]+'\\tfrac{lt}{h}'));
    //Interpolation between MAP for alt2-rpm2-temp1&2
    $('.FC-alt2-rpm2-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm2-temp1-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa2-rpm2-temp1-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BB'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa2-rpm2-temp1-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm2-temp1-map3'][0]+'\\tfrac{lt}{h}'));
    $('.FC-alt2-rpm2-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm2-temp2-map2'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa2-rpm2-temp2-map1'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-MAP2BB'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['FC-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['FC-MAP1BB'][0]+' inHg) + '+takeOffLandingUIPairs['FC-pa2-rpm2-temp2-map1'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm2-temp2-map3'][0]+'\\tfrac{lt}{h}'));

    //Interpolation between temp for alt1-rpm1&2
    //$('.FC-alt1-rpm1-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm1-temp1-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm1-temp2-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['FC-pa1-rpm1-temp2-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm1-temp3-map3'][0]+'\\tfrac{lt}{h}'));
    $('.FC-alt1-rpm2-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm2-temp1-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm2-temp2-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['FC-pa1-rpm2-temp2-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm2-temp3-map3'][0]+'\\tfrac{lt}{h}'));
    //Interpolation b-map3etween temp for alt2-rpm1&2
    //$('.FC-alt2-rpm1-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm1-temp1-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa2-rpm1-temp2-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['FC-pa2-rpm1-temp2-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm1-temp3-map3'][0]+'\\tfrac{lt}{h}'));
    $('.FC-alt2-rpm2-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm2-temp1-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa2-rpm2-temp2-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['FC-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['FC-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['FC-pa2-rpm2-temp2-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm2-temp3-map3'][0]+'\\tfrac{lt}{h}'));

    //Interpolation between rpm for alt1&2
    //$('.FC-alt1-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm2-temp3-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm1-temp3-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-RPM2'][0]+'RPM - '+takeOffLandingUIPairs['FC-RPM1'][0]+' RPM} \\cdot ( '+takeOffLandingUIPairs['FC-RPM3'][0]+'RPM - '+takeOffLandingUIPairs['FC-RPM1'][0]+' RPM) + '+takeOffLandingUIPairs['FC-pa1-rpm1-temp3-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa1-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h}'));
    //$('.FC-alt2-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa1-rpm2-temp3-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm1-temp3-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-RPM2'][0]+'RPM - '+takeOffLandingUIPairs['FC-RPM1'][0]+' RPM} \\cdot ( '+takeOffLandingUIPairs['FC-RPM3'][0]+'RPM - '+takeOffLandingUIPairs['FC-RPM1'][0]+' RPM) + '+takeOffLandingUIPairs['FC-pa1-rpm1-temp3-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa2-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h}'));

    //Interpolation between alt
    $('.FC-alt3-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['FC-pa2-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h} - '+takeOffLandingUIPairs['FC-pa1-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h} }{'+takeOffLandingUIPairs['FC-alt2'][0]+'ft - '+takeOffLandingUIPairs['FC-alt1'][0]+' ft} \\cdot ( '+takeOffLandingUIPairs['FC-alt3'][0]+'ft - '+takeOffLandingUIPairs['FC-alt1'][0]+' ft) + '+takeOffLandingUIPairs['FC-pa1-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h} = '+takeOffLandingUIPairs['FC-pa3-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h}'));

    $('.FC-both-engine-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['FC-pa3-rpm3-temp3-map3'][0]+'\\tfrac{lt}{h} \\cdot 2 engines = '+takeOffLandingUIPairs['fuelConsumption2E'][0]+'\\tfrac{lt}{h}'));


    //KTAS
    //Interpolation between MAP for alt1-rpm1-temp1&2
    //$('.KTAS-alt1-rpm1-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp1-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp1-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AA'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp1-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp1-map3'][0]+'kts'));
    //$('.KTAS-alt1-rpm1-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp2-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp2-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AA'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp2-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp2-map3'][0]+'kts'));
    //Interpolation between MAP for alt1-rpm2-temp1&2
    $('.KTAS-alt1-rpm2-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp1-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp1-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BA'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp1-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp1-map3'][0]+'kts'));
    $('.KTAS-alt1-rpm2-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp2-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp2-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BA'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp2-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp2-map3'][0]+'kts'));
    //Interpolation between MAP for alt2-rpm1-temp1&2
    //$('.KTAS-alt2-rpm1-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp1-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp1-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AB'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp1-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp1-map3'][0]+'kts'));
    //$('.KTAS-alt2-rpm1-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp2-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp2-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2AB'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1AB'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp2-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp2-map3'][0]+'kts'));
    //Interpolation between MAP for alt2-rpm2-temp1&2
    $('.KTAS-alt2-rpm2-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp1-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp1-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BB'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp1-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp1-map3'][0]+'kts'));
    $('.KTAS-alt2-rpm2-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp2-map2'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp2-map1'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-MAP2BB'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['KTAS-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['KTAS-MAP1BB'][0]+' inHg) + '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp2-map1'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp2-map3'][0]+'kts'));

    //Interpolation between temp for alt1-rpm1&2
    //$('.KTAS-alt1-rpm1-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp1-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp2-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp2-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp3-map3'][0]+'kts'));
    $('.KTAS-alt1-rpm2-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp1-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp2-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp2-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp3-map3'][0]+'kts'));
    //Interpolation b-map3etween temp for alt2-rpm1&2
    //$('.KTAS-alt2-rpm1-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp1-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp2-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp2-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm1-temp3-map3'][0]+'kts'));
    $('.KTAS-alt2-rpm2-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp1-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp2-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['KTAS-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['KTAS-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp2-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm2-temp3-map3'][0]+'kts'));

    //Interpolation between rpm for alt1&2
    //$('.KTAS-alt1-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp3-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp3-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-RPM2'][0]+'RPM - '+takeOffLandingUIPairs['KTAS-RPM1'][0]+' RPM} \\cdot ( '+takeOffLandingUIPairs['KTAS-RPM3'][0]+'RPM - '+takeOffLandingUIPairs['KTAS-RPM1'][0]+' RPM) + '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp3-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa1-rpm3-temp3-map3'][0]+'kts'));
    //$('.KTAS-alt2-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa1-rpm2-temp3-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp3-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-RPM2'][0]+'RPM - '+takeOffLandingUIPairs['KTAS-RPM1'][0]+' RPM} \\cdot ( '+takeOffLandingUIPairs['KTAS-RPM3'][0]+'RPM - '+takeOffLandingUIPairs['KTAS-RPM1'][0]+' RPM) + '+takeOffLandingUIPairs['KTAS-pa1-rpm1-temp3-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa2-rpm3-temp3-map3'][0]+'kts'));

    //Interpolation between alt
    $('.KTAS-alt3-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['KTAS-pa2-rpm3-temp3-map3'][0]+'kts - '+takeOffLandingUIPairs['KTAS-pa1-rpm3-temp3-map3'][0]+'kts }{'+takeOffLandingUIPairs['KTAS-alt2'][0]+'ft - '+takeOffLandingUIPairs['KTAS-alt1'][0]+' ft} \\cdot ( '+takeOffLandingUIPairs['KTAS-alt3'][0]+'ft - '+takeOffLandingUIPairs['KTAS-alt1'][0]+' ft) + '+takeOffLandingUIPairs['KTAS-pa1-rpm3-temp3-map3'][0]+'kts = '+takeOffLandingUIPairs['KTAS-pa3-rpm3-temp3-map3'][0]+'kts'));


    //PWR
    //Interpolation between MAP for alt1-rpm1-temp1&2
    //$('.PWR-alt1-rpm1-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm1-temp1-map2'][0]+'kts - '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp1-map1'][0]+'kts }{'+takeOffLandingUIPairs['PWR-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AA'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp1-map1'][0]+'kts = '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp1-map3'][0]+'kts'));
    //$('.PWR-alt1-rpm1-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm1-temp2-map2'][0]+'kts - '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp2-map1'][0]+'kts }{'+takeOffLandingUIPairs['PWR-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AA'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp2-map1'][0]+'kts = '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp2-map3'][0]+'kts'));
    //Interpolation between MAP for alt1-rpm2-temp1&2
    $('.PWR-alt1-rpm2-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm2-temp1-map2'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp1-map1'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BA'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp1-map1'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp1-map3'][0]+'\\%'));
    $('.PWR-alt1-rpm2-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm2-temp2-map2'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp2-map1'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BA'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BA'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp2-map1'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp2-map3'][0]+'\\%'));
    //Interpolation between MAP for alt2-rpm1-temp1&2
    //$('.PWR-alt2-rpm1-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm1-temp1-map2'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp1-map1'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-MAP2AA'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AB'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp1-map1'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp1-map3'][0]+'\\%'));
    //$('.PWR-alt2-rpm1-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm1-temp2-map2'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp2-map1'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-MAP2AB'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1AB'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp2-map1'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp2-map3'][0]+'\\%'));
    //Interpolation between MAP for alt2-rpm2-temp1&2
    $('.PWR-alt2-rpm2-temp1-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm2-temp1-map2'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp1-map1'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-MAP2BA'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BB'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp1-map1'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp1-map3'][0]+'\\%'));
    $('.PWR-alt2-rpm2-temp2-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm2-temp2-map2'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp2-map1'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-MAP2BB'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BB'][0]+' inHg} \\cdot ( '+takeOffLandingUIPairs['PWR-MAP3'][0]+'inHg - '+takeOffLandingUIPairs['PWR-MAP1BB'][0]+' inHg) + '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp2-map1'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp2-map3'][0]+'\\%'));

    //Interpolation between temp for alt1-rpm1&2
    //$('.PWR-alt1-rpm1-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm1-temp1-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp2-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp2-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp3-map3'][0]+'\\%'));
    $('.PWR-alt1-rpm2-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm2-temp1-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp2-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp2-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa1-rpm2-temp3-map3'][0]+'\\%'));
    //Interpolation b-map3etween temp for alt2-rpm1&2
    //$('.PWR-alt2-rpm1-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm1-temp1-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp2-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp2-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm1-temp3-map3'][0]+'\\%'));
    $('.PWR-alt2-rpm2-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm2-temp1-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp2-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp1'][0]+' ^\\circ C} \\cdot ( '+takeOffLandingUIPairs['PWR-temp2'][0]+'^\\circ C - '+takeOffLandingUIPairs['PWR-temp3'][0]+' ^\\circ C) + '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp2-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm2-temp3-map3'][0]+'\\%'));

    //Interpolation between rpm for alt1&2
    //$('.PWR-alt1-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm2-temp3-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp3-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-RPM2'][0]+'RPM - '+takeOffLandingUIPairs['PWR-RPM1'][0]+' RPM} \\cdot ( '+takeOffLandingUIPairs['PWR-RPM3'][0]+'RPM - '+takeOffLandingUIPairs['PWR-RPM1'][0]+' RPM) + '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp3-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa1-rpm3-temp3-map3'][0]+'\\%'));
    //$('.PWR-alt2-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa1-rpm2-temp3-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp3-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-RPM2'][0]+'RPM - '+takeOffLandingUIPairs['PWR-RPM1'][0]+' RPM} \\cdot ( '+takeOffLandingUIPairs['PWR-RPM3'][0]+'RPM - '+takeOffLandingUIPairs['PWR-RPM1'][0]+' RPM) + '+takeOffLandingUIPairs['PWR-pa1-rpm1-temp3-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa2-rpm3-temp3-map3'][0]+'\\%'));

    //Interpolation between alt
    $('.PWR-alt3-rpm3-temp3-equation').html(MathJax.tex2svg('\\frac{'+takeOffLandingUIPairs['PWR-pa2-rpm3-temp3-map3'][0]+'\\% - '+takeOffLandingUIPairs['PWR-pa1-rpm3-temp3-map3'][0]+'\\% }{'+takeOffLandingUIPairs['PWR-alt2'][0]+'ft - '+takeOffLandingUIPairs['PWR-alt1'][0]+' ft} \\cdot ( '+takeOffLandingUIPairs['PWR-alt3'][0]+'ft - '+takeOffLandingUIPairs['PWR-alt1'][0]+' ft) + '+takeOffLandingUIPairs['PWR-pa1-rpm3-temp3-map3'][0]+'\\% = '+takeOffLandingUIPairs['PWR-pa3-rpm3-temp3-map3'][0]+'\\%'));
    
}

function floorOrCeil(value)
{
    if (value > 0) {
        return Math.ceil(value);
    }

    return Math.floor(value);
}

function ceilingCheck(ceiling)
{
    var output = Math.floor(ceiling.ceiling);

    if (ceiling.isTopOfData) {
        output = '> '+ ceiling.ceiling;
    }

    return output;
}

function updateUIValues(dataset)
{
    for (var i in dataset) {
        var item    = dataset[i],
            element = $('.'+ i),
            value   = item[0],
            suffix  = item[1];

        if (
            value === '' ||
            (typeof value == 'number' && isNaN(value)) ||
            value === null
        ) {
            value = '-';
        } else {
            value = value +' '+ suffix;
        }

        element.html(value);
    }
}

function getWindComponents()
{
    // Calculate HWC/TWC and XWC.
    var headwindComponent =  Math.ceil(Math.cos(toRadians(windDirInput - rwyDirInput)) * windSpdInput *10)/10;
    var crosswindComponent = Math.ceil(Math.sin(toRadians(windDirInput - rwyDirInput)) * windSpdInput *10)/10;
    var headOrTail = 'Headwind';

    //if component is negative, round down instead of up
    if (Math.cos(toRadians(windDirInput - rwyDirInput)) * windSpdInput < 0){
        var headwindComponent = Math.floor(Math.cos(toRadians(windDirInput - rwyDirInput)) * windSpdInput *10)/10;
        headOrTail = 'Tailwind'
    }
    if (Math.sin(toRadians(windDirInput - rwyDirInput)) * windSpdInput < 0){
        var crosswindComponent = Math.floor(Math.sin(toRadians(windDirInput - rwyDirInput)) * windSpdInput *10)/10;
    }

    if (isNaN(headwindComponent)) {
        headwindComponent = 0;
    }

    if (isNaN(crosswindComponent)) {
        crosswindComponent = 0;
    }

    return {
        'headOrTail': headOrTail,
        'head': headwindComponent,
        'cross': crosswindComponent
    };
}

function getPressureCorrection()
{
    return ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT);
}

function toTrueAltitude(pa)
{
    return pa + getPressureCorrection();
}

function toPressureAltitude(ta)
{
    return ta - getPressureCorrection();
}

function toISAdeviation(temp, elev)
{
    let StdLapseRate = 0.00198
    return temp + Math.round(elev * StdLapseRate) - 15;
}

function toDegrees(angle)
{
    return angle * (180 / Math.PI);
}

function toRadians(angle)
{
    return angle * (Math.PI / 180);
}

function parseIntOrFloat(n)
{
    // Hack to convert '12' -> 12 and '12.5' -> 12.5 and 'hello world' -> NaN
    return n * 1;
}

// Functions for interpolation

function findKeysForInterpolation(needle, haystack)
{
    /*
    if (needle == 10) {
        debugger
    }
    */

    var largerThan = [],
        lessThan   = [];
        
    for (var i in haystack) {
        if (typeof haystack[i] == 'string' && haystack[i].toLowerCase() == 'spacing') {
            continue;
        }
        if (haystack[i] >= needle) {
            largerThan.push(parseIntOrFloat(haystack[i], 10));
        } else {
            lessThan.push(parseIntOrFloat(haystack[i], 10));
        }
    }

    var largerValue = Math.min(...largerThan)
    var lessValue = Math.max(...lessThan)

    //Check if there are values larger than the input
    if (largerThan.length == 0) {
        //Delete the used value from the array, using the splice function to avoid leaving a null value in the array
        lessThan.splice(lessThan.indexOf(lessValue),1)
        //Assign the current lessValue as larger, as it will be larger than any other value
        largerValue = lessValue
        //Assign the new max (after deleting the used one) of the lessThan array as lessValue
        lessValue = Math.max(...lessThan)
    }
    //Check if there are values smaller than the input
    else if (lessThan.length == 0) {
        //Delete the used value from the array, using the splice function to avoid leaving a null value in the array
        largerThan.splice(largerThan.indexOf(largerValue),1)
        //Assign the current largerValues as less, as it will be smaller than any other value
        lessValue = largerValue
        //Assign the new min (after deleting the used one) of the largerThan array as largerValue
        largerValue = Math.min(...largerThan)
    }
    //TODO add warning to end user that data is out of parameters

    return [lessValue, largerValue];
}

function findDataValuesInDataset(needle, dataset, keys)
{
    //I'm pretty sure we can skip this function and just juse keys
    var interpolateKeys = findKeysForInterpolation(needle, keys);

    var keyOne = interpolateKeys[0],
        keyTwo = interpolateKeys[1],
        valueOne = dataset[keyOne],
        valueTwo = dataset[keyTwo];

    return [valueOne, valueTwo];
}

function interpolate1D(needle, dataset, keys)
{
    var interpolateKeys = findKeysForInterpolation(needle, keys);

    var keyOne = interpolateKeys[0],
        keyTwo = interpolateKeys[1],
        valueOne = dataset[keyOne],
        valueTwo = dataset[keyTwo];

    return (valueTwo - valueOne) / (keyTwo - keyOne) * (needle - keyOne) + valueOne;    
}

function interpolate2D()
{
    // TODO..
}

function interpolate3D(pressureAltitudeInput, degreeInput, massInput, matrixData)
{
    var massKeys = Object.keys(matrixData),
        massKeys2 = findKeysForInterpolation(massInput, massKeys),
        mass1 = massKeys2[0],
        mass2 = massKeys2[1];

    var degreeKeys = Object.keys(matrixData[mass1]),
        degreeKeys2 = findKeysForInterpolation(degreeInput, degreeKeys),
        degree1 = degreeKeys2[0],
        degree2 = degreeKeys2[1];

    var pressureAltitudeKeys = Object.keys(matrixData[mass1][degree1]),
        pressureAltitudeKeys2 = findKeysForInterpolation(pressureAltitudeInput / matrixData.spacing, pressureAltitudeKeys),
        pressureAltitude1 = pressureAltitudeKeys2[0],
        pressureAltitude2 = pressureAltitudeKeys2[1];

    var pressureAltitudeKeys = [pressureAltitude1, pressureAltitude2];


    var interpolationData1D1 = {
        [degree1]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree2], pressureAltitudeKeys),
        
        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree2], pressureAltitudeKeys)
    };

    var interpolationData1D2 = {
        [degree1]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree2], pressureAltitudeKeys),

        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree2], pressureAltitudeKeys)
    };

    var interpolationData2D = {};
    if (degreeKeys2.indexOf(degreeInput) !== -1) {
        interpolationData2D = {
            [mass1]: interpolationData1D1[degreeInput],
            [mass2]: interpolationData1D2[degreeInput],

            [mass1 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D1, degreeKeys2),
            [mass2 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2, degreeKeys2),
        };
    } else {
        interpolationData2D = {
            [mass1]: interpolate1D(degreeInput, interpolationData1D1, degreeKeys2),
            [mass2]: interpolate1D(degreeInput, interpolationData1D2, degreeKeys2),

            [mass1 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D1, degreeKeys2),
            [mass2 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2, degreeKeys2),
        };
    }

    var interpolationData3D = {
        'result': interpolate1D(massInput, interpolationData2D, massKeys2),
        ['raw']: findDataValuesInDataset(massInput, interpolationData2D, massKeys2)
    }

    return {
        'result': interpolationData3D['result'],
        'data': {
            '1D1': interpolationData1D1,
            '1D2': interpolationData1D2,
            '2D': interpolationData2D,
            '3D': interpolationData3D,
        },
        'keys': {
            'mass1': mass1,
            'mass2': mass2,
            'mass3': massInput,
            'temp1': degree1,
            'temp2': degree2,
            'temp3': degreeInput,
            'alt1': pressureAltitude1 * matrixData.spacing,
            'alt2': pressureAltitude2 * matrixData.spacing,
            'alt3': pressureAltitudeInput,
            'altSpacing': matrixData.spacing
        }
    };
};

function interpolate4D(pressureAltitudeInput,RPMinput,degreeInput,mapInput,matrixData)
{
    var pressureAltitudeKeys = Object.keys(matrixData),
    pressureAltitudeKeys2 = findKeysForInterpolation(pressureAltitudeInput,pressureAltitudeKeys),
    pressureAltitude1 = pressureAltitudeKeys2[0],
    pressureAltitude2 = pressureAltitudeKeys2[1];

    var RPMkeys = Object.keys(matrixData[pressureAltitude1]),
    RPMkeys2 = findKeysForInterpolation(RPMinput,RPMkeys),
    RPM1 = RPMkeys2[0],
    RPM2 = RPMkeys2[1]

    var tempKeys = Object.keys(matrixData[pressureAltitude1][RPM1]);
    var tempMAPIndex = tempKeys.indexOf('MAP');
    if (tempMAPIndex !== -1) {
        delete tempKeys[tempMAPIndex];
    }

    var tempKeys2 = findKeysForInterpolation(degreeInput,tempKeys),
        temp1 = tempKeys2[0],
        temp2 = tempKeys2[1];

    var MAPkeysAA = Object.keys(matrixData[pressureAltitude1][RPM1][temp1]),
        MAPkeysAA2 = findKeysForInterpolation(mapInput,MAPkeysAA),
        MAP1AA = MAPkeysAA2[0],
        MAP2AA = MAPkeysAA2[1];

    var MAPkeysBA = Object.keys(matrixData[pressureAltitude2][RPM1][temp1]),
        MAPkeysBA2 = findKeysForInterpolation(mapInput,MAPkeysBA),
        MAP1BA = MAPkeysBA2[0],
        MAP2BA = MAPkeysBA2[1];

    var MAPkeysAB = Object.keys(matrixData[pressureAltitude1][RPM2][temp1]),
        MAPkeysAB2 = findKeysForInterpolation(mapInput,MAPkeysAB),
        MAP1AB = MAPkeysAB2[0],
        MAP2AB = MAPkeysAB2[1];

    var MAPkeysBB = Object.keys(matrixData[pressureAltitude2][RPM2][temp1]),
        MAPkeysBB2 = findKeysForInterpolation(mapInput,MAPkeysBB),
        MAP1BB = MAPkeysBB2[0],
        MAP2BB = MAPkeysBB2[1];


    //Interpolation between MAPs for temp1 & temp2 using RPM1 and pressureAltitude1
    var interpolationData1D1 = {
        [temp1]: interpolate1D(mapInput,matrixData[pressureAltitude1][RPM1][temp1],MAPkeysAA),
        [temp2]: interpolate1D(mapInput,matrixData[pressureAltitude1][RPM1][temp2],MAPkeysAA),

        [temp1+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude1][RPM1][temp1],MAPkeysAA),
        [temp2+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude1][RPM1][temp2],MAPkeysAA)
    }

    //Interpolation between MAPs for temp1 & temp2 using RPM2 and pressureAltitude1
    var interpolationData1D2 = {
        [temp1]: interpolate1D(mapInput,matrixData[pressureAltitude1][RPM2][temp1],MAPkeysAB),
        [temp2]: interpolate1D(mapInput,matrixData[pressureAltitude1][RPM2][temp2],MAPkeysAB),

        [temp1+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude1][RPM2][temp1],MAPkeysAB),
        [temp2+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude1][RPM2][temp2],MAPkeysAB)
    }

    //Interpolation between MAPs for temp1 & temp2 using RPM1 and pressureAltitude2
    var interpolationData1D3 = {
        [temp1]: interpolate1D(mapInput,matrixData[pressureAltitude2][RPM1][temp1],MAPkeysBA),
        [temp2]: interpolate1D(mapInput,matrixData[pressureAltitude2][RPM1][temp2],MAPkeysBA),

        [temp1+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude2][RPM1][temp1],MAPkeysBA),
        [temp2+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude2][RPM1][temp2],MAPkeysBA)
    }

    //Interpolation between MAPs for temp1 & temp2 using RPM2 and pressureAltitude2
    var interpolationData1D4 = {
        [temp1]: interpolate1D(mapInput,matrixData[pressureAltitude2][RPM2][temp1],MAPkeysBB),
        [temp2]: interpolate1D(mapInput,matrixData[pressureAltitude2][RPM2][temp2],MAPkeysBB),

        [temp1+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude2][RPM2][temp1],MAPkeysBB),
        [temp2+'-raw']: findDataValuesInDataset(mapInput,matrixData[pressureAltitude2][RPM2][temp2],MAPkeysBB)
    }

    //Interpolation between temps for RPM1 & RPM2 using pressureAltitude1 (data from 1D1 & 1D2)
    var interpolationData2D1 = {};
    if (tempKeys2.indexOf(degreeInput) !== -1) {
        // Skip interpolation (to save performance) and just grab the values.
        interpolationData2D1 = {
            [RPM1]: interpolationData1D1[degreeInput],
            [RPM2]: interpolationData1D2[degreeInput],

            [RPM1+'-raw']: findDataValuesInDataset(degreeInput,interpolationData1D1,tempKeys2),
            [RPM2+'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2,tempKeys2)
        };
    } else {
        interpolationData2D1 = {
            [RPM1]: interpolate1D(degreeInput,interpolationData1D1,tempKeys2),
            [RPM2]: interpolate1D(degreeInput, interpolationData1D2,tempKeys2),

            [RPM1+'-raw']: findDataValuesInDataset(degreeInput,interpolationData1D1,tempKeys2),
            [RPM2+'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2,tempKeys2)
        }
    }

    //Interpolation between temps for RPM1 & RPM2 using pressureAltitude2 (data from 1D3 & 1D4)
    var interpolationData2D2 = {};
    if (tempKeys2.indexOf(degreeInput) !== -1) {
        // Skip interpolation (to save performance) and just grab the values.
        interpolationData2D2 = {
            [RPM1]: interpolationData1D3[degreeInput],
            [RPM2]: interpolationData1D4[degreeInput],

            [RPM1+'-raw']: findDataValuesInDataset(degreeInput,interpolationData1D3,tempKeys2),
            [RPM2+'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D4,tempKeys2)
        };
    } else {
        interpolationData2D2 = {
            [RPM1]: interpolate1D(degreeInput,interpolationData1D3,tempKeys2),
            [RPM2]: interpolate1D(degreeInput, interpolationData1D4,tempKeys2),

            [RPM1+'-raw']: findDataValuesInDataset(degreeInput,interpolationData1D3,tempKeys2),
            [RPM2+'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D4,tempKeys2)
        }
    }

    var interpolationData3D = {};
    if (RPMkeys2.indexOf(RPMinput) !== -1) {
        // Skip interpolation (to save performance) and just grab the values.
        interpolationData3D = {
            [pressureAltitude1]: interpolationData2D1[RPMinput],
            [pressureAltitude2]: interpolationData2D2[RPMinput]
        };
    } else {
        //Interpolation between RPMs for pressureAltitude1 & 2 (data from 2D1 & 2D2)
        interpolationData3D = {
            [pressureAltitude1]: interpolate1D(RPMinput,interpolationData2D1,RPMkeys2),
            [pressureAltitude2]: interpolate1D(RPMinput,interpolationData2D2,RPMkeys2),

            [pressureAltitude1+'-raw']: findDataValuesInDataset(RPMinput,interpolationData2D1,RPMkeys2),
            [pressureAltitude2+'-raw']: findDataValuesInDataset(RPMinput,interpolationData2D2,RPMkeys2)
        };
    }

    //Interpolation between pressureAltitudes
    var interpolationData4D = {
        'result': interpolate1D(pressureAltitudeInput,interpolationData3D,pressureAltitudeKeys2),
        'raw': findDataValuesInDataset(pressureAltitudeInput,interpolationData3D,pressureAltitudeKeys2) 
    }

    return {
        'result': interpolationData4D['result'],
        'data': {
            '1D1':interpolationData1D1,
            '1D2':interpolationData1D2,
            '1D3':interpolationData1D3,
            '1D4':interpolationData1D4,
            '2D1':interpolationData2D1,
            '2D2':interpolationData2D2,
            '3D':interpolationData3D,
            '4D':interpolationData4D
        },
        'keys': {
            'MAP1AA':MAP1AA,
            'MAP1AB':MAP1AB,
            'MAP1BA':MAP1BA,
            'MAP1BB':MAP1BB,
            'MAP2AA':MAP2AA,
            'MAP2AB':MAP2AB,
            'MAP2BA':MAP2BA,
            'MAP2BB':MAP2BB,
            'MAP3':mapInput,
            'temp1': temp1,
            'temp2': temp2,
            'temp3': degreeInput,
            'RPM1': RPM1,
            'RPM2': RPM2,
            'RPM3': RPMinput,
            'alt1': pressureAltitude1,
            'alt2': pressureAltitude2,
            'alt3': pressureAltitudeInput
        }
    }

}

function calculateGradient(roc,gs){
    return roc / (gs / 60 * 6076)
}

// Functions for specifics

//Cruise data
function calculateFuelConsumption(pa, isaDeviation, MAP, RPM) {
    var sfcTemp = isaDeviation + 15
    return interpolate4D(pa,RPM,sfcTemp,MAP,FCmatrix)
}

function calculateTrueAirspeed(pa, isaDeviation, MAP, RPM) {
    var sfcTemp = isaDeviation + 15
    return interpolate4D(pa,RPM,sfcTemp,MAP,KTASmatrix)
}

function calculatePowerSetting(pa,isaDeviation,MAP,RPM) {
    var sfcTemp = isaDeviation + 15
    return interpolate4D(pa, RPM,sfcTemp,MAP,PWRmatrix)
}

//Takeoff distances
function calculateTakeOffGroundRoll(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeOffGroundMatrix);
}

function calculateTakeOffDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,takeOffFiftyFtMatrix)
}

//Landing distances
function calculateLandingGroundRoll(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingGroundMatrix)
}

function calculateLandingDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingFiftyFtMatrix)
}

//Minimums temperature correction.
function calculateTempCorrectionToMinima(pe, isaDeviation, daMda) {
    //pe -> pressure elevation
    //isaDeviation -> temperature deviation from ISA
    //daMda -> altitude to be corrected

    let StdLapseRate = 0.00198 // 0.00198 degrees per foot, equivalent to 1.98 degrees per 1000ft

    return ((isaDeviation * -1)/StdLapseRate)*Math.log(1+(StdLapseRate*(toPressureAltitude(daMda)-pe))/(273+15+StdLapseRate*toTrueAltitude(pe)))
    //This is the most accurate formula mentioned in ICAO PANS-OPS, Volume III, Section2, Chapter 4, 4.3, “Temperature correction”
    //The formula is devised by the Engineering Sciences Data Unit (ESDU), and published in their publication "Performance", volume 2, as item number 77022

    return (toPressureAltitude(daMda) - pe) * ( (isaDeviation * -1) / (273 + isaDeviation+15 - 0.5 * StdLapseRate * pe) )
    //This is the second most accurate formula mentioned in ICAO PANS-OPS, Volume III, Section2, Chapter 4, 4.3, “Temperature correction”
    //According to ICAO, this formula produces results accurate to within 5% of the correction, up to elevations of 10,000ft and Heights above elevation of 5,000ft
    //Table 2-4-1 b is based on this formula

    return 0.04 * (isaDeviation/-10) * (toPressureAltitude(daMda) - pe)
    //In cases where the measured temperature at the station is higher than -15C, correcting the height by 4% for every 10C below ISA is accaptable by ICAO, regardless of the elevation, but in my opinion, any of the other methods are preferable
}

function generateTempCorrectionTable(elevation, temp, daMda) {
    
    var altitudes = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 3500]
    altitudes.push(daMda)
    altitudes.sort(function(a,b){
        return a - b
    })

    var temps = [temp-4, temp-2, temp, temp+2, temp+4]

    var correctionTableArray = []

    altitudes.forEach(function(a){
        var array = []
        temps.forEach(function(t){
            array.push(Math.ceil(calculateTempCorrectionToMinima(toPressureAltitude(elevation),toISAdeviation(t,elevation),a)))
        })
        correctionTableArray.push(array)
    })

    return {
        'altitudes': altitudes,
        'temps': temps,
        'values': correctionTableArray
    }
}

//Climb speeds
function calculateToVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffClimbVyMatrix)
}

function calculateToVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffClimbVxMatrix)
}

function calculateVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVyMatrix)
}

function calculateVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxMatrix)
}

function calculateVySe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVySeMatrix)
}

function calculateVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxSeMatrix)
}

//Rates of climb
function calculateToROCVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffROCVyMatrix)
}

function calculateToROCVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffROCVxMatrix)
}

function calculateRocVy(pa, isaDeviation, tom) {
    var sfcTemp = Math.round((isaDeviation + 15) * 10) / 10;
    return interpolate3D(pa, sfcTemp, tom, ROCVyMatrix)
}

function calculateRocVx(pa, isaDeviation, tom) {
    var sfcTemp = Math.round((isaDeviation + 15) * 10) / 10;
    return interpolate3D(pa, sfcTemp, tom, ROCVxMatrix)
}

function calculateRocVySe(pa, isaDeviation, tom) {
    var sfcTemp = Math.round((isaDeviation + 15) * 10) / 10;
    var altTemp = getTempAtAlt(sfcTemp, pa);
    return interpolate3D(pa, altTemp, tom, ROCVySeMatrix);
}

function calculateRocVxSe(pa, isaDeviation, tom) {
    var sfcTemp = Math.round((isaDeviation + 15) * 10) / 10;
    return interpolate3D(pa, sfcTemp, tom, ROCVxSeMatrix)
}

//Time in climb
function minutesInClimb(pa1,pa2,isaDeviation,mass) {
    var alt = pa1
    var min = 0
    while (alt < pa2){
        alt += 10
        min += 10 / calculateRocVy(alt,isaDeviation,mass).result
    }
    var minutesDecimal = Math.ceil(min * 60) / 60
    var minutes = Math.floor(minutesDecimal)
    var seconds = Math.round((minutesDecimal - minutes) * 60)

    return {
        'number': minutesDecimal,
        'string': minutes+':'+ ("0"+seconds).slice(-2)
    }
}

function boringMinutesInClimb(pa1,pa2,isaDeviation,mass) {
    var distToClimb = pa2 - pa1
    var rocAlt = (pa2 - pa1) / 3 * 2 + pa1
    var rocVy = calculateRocVy(rocAlt,isaDeviation,mass).result
    var Vy = calculateVy(rocAlt, isaDeviation,mass)
    var minutesDecimal = Math.ceil(distToClimb / rocVy *60)/60
    var minutes = Math.floor(minutesDecimal)
    var seconds = Math.round((minutesDecimal - minutes) * 60)
    return {
        'number': minutesDecimal,
        'string': minutes+':'+ ("0"+seconds).slice(-2),
        'Vy': Vy
    }
}

function distanceInMinutes(minutes, groundspeed) {
    return groundspeed * (minutes / 60)
}

//Gradients
function calculateToGradientVy(pa, isaDeviation, tom) {
    var ias = calculateToVy(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVy
    }
    var roc = calculateToROCVy(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateToGradientVx(pa, isaDeviation, tom) {
    var ias = calculateToVx(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVx
    }
    var roc = calculateToROCVx(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVy(pa, isaDeviation, tom) {
    var ias = calculateVy(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVy
    }
    var roc = calculateRocVy(pa, isaDeviation, tom).result
    return {
        result: [calculateGradient(roc, ias)],
        roc: [roc],
        ias: [ias],
        useStd: [!useCalculatedClimbSpeedsInGradients]
    }
}

function calculateGradientVx(pa, isaDeviation, tom) {
    var ias = calculateVx(pa, isaDeviation,tom) .result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVx
    }
    var roc = calculateRocVx(pa, isaDeviation, tom).result
    return {
        result: [calculateGradient(roc, ias)],
        roc: [roc],
        ias: [ias],
        useStd: [!useCalculatedClimbSpeedsInGradients]
    }
}

function calculateGradientVySe(pa, isaDeviation, tom) {
    var ias = calculateVySe(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVySe
    }
    var roc = calculateRocVySe(pa, isaDeviation, tom, true).result
    return {
        result: [calculateGradient(roc, ias)],
        roc: [roc],
        ias: [ias],
        useStd: [!useCalculatedClimbSpeedsInGradients]
    }
}

function calculateGradientVxSe(pa, isaDeviation, tom) {
    var ias = calculateVxSe(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVxSe
    }
    var roc = calculateRocVxSe(pa, isaDeviation, tom).result
    return {
        result: [calculateGradient(roc, ias)],
        roc: [roc],
        ias: [ias],
        useStd: [!useCalculatedClimbSpeedsInGradients]
    }
}

//Angles
function calculateAngle(grad){
    return toDegrees(Math.atan(grad))
}


//Ceilings
function calculateOEIceiling(isaDeviation, tom) {
    var serviceCeiling = 7000,
        fpm = 1;
        lastInterpolation = null,
        interpolations = [],
        breakLoopNextModulusIteration = false;
    
    var temp = isaDeviation + 15;
    while (true) {
        var tempAtAlt = getTempAtAlt(temp, serviceCeiling);
        lastInterpolation = calculateRocVySe(serviceCeiling, isaDeviation, tom);
        fpm = lastInterpolation.result;

        if (serviceCeiling % 100 === 0) {
            interpolations.push([serviceCeiling, lastInterpolation.result]);

            if (breakLoopNextModulusIteration === 2) {
                break;
            }

            if (breakLoopNextModulusIteration !== false) {
                breakLoopNextModulusIteration++;
            }
        }

        if (fpm >= 50) {
            if (breakLoopNextModulusIteration === false) {
                breakLoopNextModulusIteration = 1;
                interpolations.push([serviceCeiling, lastInterpolation.result, lastInterpolation]);
            }
        }

        serviceCeiling -= 10;
    }

    interpolations = interpolations.reverse();

    // Set the service ceiling to be the correct one.
    serviceCeiling = interpolations[2][0];
    
    //convert pressure altitude to true altitude
    var trueServiceCeiling = toTrueAltitude(serviceCeiling);

    // Flag if result is outside dataset.
    var isTopOfData = (serviceCeiling == 7000);

    return {
        'ceiling': trueServiceCeiling,
        'pressureCeiling': serviceCeiling,
        'pressureCorrection': getPressureCorrection(),
        'isTopOfData': isTopOfData,
        'data': interpolations
    };
}

function calculateOEIabsoluteCeiling(isaDeviation, tom) {
    var absoluteCeiling = 7000;
    var fpm = -1;
    while (fpm < 0) {
        var tempAtAlt = getTempAtAlt(isaDeviation, absoluteCeiling)
        fpm = calculateRocVySe(absoluteCeiling, tempAtAlt, tom).result;
        
        if (fpm < 0) {
            absoluteCeiling -= 10;
        }
    }

    var isTopOfData = (absoluteCeiling == 7000);

    //convert pressure altitude to true altitude
    absoluteCeiling = toTrueAltitude(absoluteCeiling)

    return {
        'ceiling': absoluteCeiling,
        'isTopOfData': isTopOfData
    };
}

//Corrections
function takeoffCorrectedCalculations(pa, isaDeviation, tom, slope)
{
    var groundroll = calculateTakeOffGroundRoll(pa, isaDeviation, tom);
    var distance = calculateTakeOffDist(pa, isaDeviation, tom);
    var altitudes = findKeysForInterpolation(pa, landingGroundMatrix[1230][0]);
    
    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents();
        if (windComponents.head > 0) {                           //If there is headwind
            windCorrection = windComponents.head * -2.5;         //Remove 2,5m per kt
        } else {                                                 //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 10;    //Add 10m per kt
        }    
    }
    

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.06       //Remove 6% of Groundroll
    }

    var slopeCorrection = 0;
    if (useSlope) {
        //Correction for Runway slope, according to AFM
        if (slope > 0) {
            slopeCorrection = slope / 0.01 * 0.05 * groundroll.result;  //Add 5% of groundroll per 1% upslope
        }    
    }
    else {
        slope = 0
    }
    

    //Correction for soft surface, according to GreyBird procedure
    var softSfcCorrection = 0;
    if (useSoftSfc) {                                       //If the surface is soft
        softSfcCorrection = groundroll.result * 0.25;       //Add 25% of groundroll
    }

    /*
    TODO - Add Corrections for:
    Water & Slush (cm)
    Wet snow (cm)
    Frozen snow (cm)
    */

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorrection': pavedRwyCorrection,
        'slope': slope,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections) {            //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    corrections['combined'] = sumCorrections;

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.25),   //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.25),       //Distance to 50ft in meters
        'corrections': corrections                                     //List of all corrections applied
    };
}

function landingCorrectedCalculations(pa, isaDeviation, tom, slope) {
    var groundroll = calculateLandingGroundRoll(pa, isaDeviation, tom);
    var distance = calculateLandingDist(pa, isaDeviation, tom);

    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents()
        if (windComponents.head > 0) {                          //If there is headwind
            windCorrection = windComponents.head * -5;          //Remove 5m per kt
        }
        else {                                                  //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 11;   //Add 11m per kt
        }
    }

    var appSpeedCorrection = 0
    //Correction for increased approach speed
    if (useIncreasedAppSpeed){
        appSpeedCorrection = 110                            //10 kts Increased approach speed calculated as tailwind of 10 kts
    }

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.02       //Remove 2% of Groundroll
    }

    var slopeCorrection = 0;
    if (useSlope) {
        //Correction for Runway slope, according to GreyBird Procedures
        if (slope < 0) {                                                //if there is downslope
            slopeCorrection = slope / 0.02 * 0.10 * groundroll.result;  //Add 10% of groundroll per 2% upslope
        } 
    }
    
    //Correction for soft surface or snow, according to GreyBird procedure
    var softSfcCorrection = 0;
    if (useSoftSfc || useSnowCorrection) {                  //If the surface is soft, or there is snow
        softSfcCorrection = groundroll.result * 0.25;       //Add 25% of groundroll
    }

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorrection': pavedRwyCorrection,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection,
        'appSpeedCorrection': appSpeedCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections){                 //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    corrections['combined'] = sumCorrections

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.43),    //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.43),        //Distance from 50ft in meters
        'corrections': corrections                                      //List of all corrections applied
    };
}

function calculateASDR(takeoff, landing)
{
    // ASDR = T/O gr (uncorrected) + LDG gr (minus 5-6 kts) +/- Wind (to get GS rather than TAS) * 1.25 + Time Factor

    // TO GR
    var ASDR = takeoff.uncorrectedGround.result;

    ASDR += landing.uncorrectedGround.result;
    var uncorrected = ASDR;
    
    // Landing GR - TAS should be 5 kts lower than stated in AFM.
    var ldgGRCorrection = 5 * -5;
    ASDR = ASDR + ldgGRCorrection


    // Wind Correction
    var windCorrection;
    if (useWindComponent) {
        windCorrection = takeoff.corrections.windCorrection
        ASDR = ASDR + windCorrection;
    }

    // Safety Factor
    var beforeSafetyASDR = ASDR;
    var safetyFactor = ASDR * 0.25;
    ASDR = Math.ceil(ASDR + safetyFactor);

    
    // Time Factor
    var beforeTimeASDR = ASDR;
    var timeFactor = 65 / 3600 * 3 * 1852;
    ASDR = Math.ceil(ASDR + timeFactor);

    return {
        'uncorrected': uncorrected,
        'corrected': ASDR,
        'beforeTimeCorrection': beforeTimeASDR,
        'beforeSafetyCorrection': beforeSafetyASDR,
        'corrections': {
            'ldgCorrection': ldgGRCorrection,
            'wind': windCorrection,
            'safetyFactor': safetyFactor,
            'timeFactor': timeFactor
        }
    }

}

function getROCAltitude(msa, pa, pe)
{
    var rocAltitude = msa;
    if (!useMSAROC) {
        rocAltitude = (pa - pe) / 3 * 2 + pe;
    }

    return rocAltitude;
}

function getTempAtAlt(temp,altAbove){
    return Math.ceil(temp - (1.98 * (altAbove/1000)));
}

function calculateAll(pe, pa, msa, isaDeviation, tom, daMda)
{
    var rocAltitude = getROCAltitude(msa, pa, pe);
    //var rocISADeviation = isaDeviation - (1.98 * (rocAltitude / 1000));
    //The above name is misleading, as the isaDeviation is assumed to be the same at all altitudes

    var MAP = 24,
        RPM = 2100;

    var boringMinInClimb = boringMinutesInClimb(pe,pa,isaDeviation,tom);

    data = {
        //CruiseData
        'Powersetting': calculatePowerSetting(pa,isaDeviation,MAP,RPM),
        'KTAS': calculateTrueAirspeed(pa,isaDeviation,MAP,RPM),
        'FuelConsumption': calculateFuelConsumption(pa,isaDeviation,MAP,RPM),

        //Takeoff and landing distances
        'takeoff': takeoffCorrectedCalculations(pe, isaDeviation, tom, null),
        'landing': landingCorrectedCalculations(pe, isaDeviation, tom, null),
        'tempCorrectionToMinima': calculateTempCorrectionToMinima(pe, isaDeviation, daMda),
        'minimaCorrectionTable': generateTempCorrectionTable(elevationInput, temperatureInput, daMda),

        //Climb performance numbers, all with max cont. power setting and gear up
        //Takeoff Vy (flaps takeoff)
        'toVy': calculateToVy(rocAltitude, isaDeviation, tom),
        'toRocVy': calculateToROCVy(rocAltitude, isaDeviation, tom),
        'toGradVy': calculateToGradientVy(rocAltitude, isaDeviation,tom),
        'toAngleVy': calculateAngle(calculateToGradientVy(rocAltitude,isaDeviation,tom).result),
        //Takeoff Vx (flaps takeoff)
        'toVx': calculateToVx(rocAltitude, isaDeviation, tom),
        'toRocVx': calculateToROCVx(rocAltitude, isaDeviation, tom),
        'toGradVx': calculateToGradientVx(rocAltitude, isaDeviation, tom),
        'toAngleVx': calculateAngle(calculateToGradientVx(rocAltitude,isaDeviation,tom).result),
        //Enroute Vy (flaps&gear up)
        'Vy': calculateVy(rocAltitude, isaDeviation,tom),
        'rocVy': calculateRocVy(rocAltitude, isaDeviation, tom),
        'gradVy': calculateGradientVy(rocAltitude, isaDeviation,tom),
        'angleVy': calculateAngle(calculateGradientVy(rocAltitude,isaDeviation,tom).result),
        //Enroute Vx (flaps up)
        'Vx': calculateVx(rocAltitude, isaDeviation, tom),
        'rocVx': calculateRocVx(rocAltitude, isaDeviation, tom),
        'gradVx': calculateGradientVx(rocAltitude, isaDeviation,tom),
        'angleVx': calculateAngle(calculateGradientVx(rocAltitude,isaDeviation,tom).result),
        //VySe (one engine inoperative, and feathered, flaps up)
        'VySe': calculateVySe(rocAltitude, isaDeviation, tom),
        'rocVySe': calculateRocVySe(rocAltitude, isaDeviation, tom, true),
        'gradVySe': calculateGradientVySe(rocAltitude,isaDeviation,tom),
        'angleVySe': calculateAngle(calculateGradientVySe(rocAltitude,isaDeviation,tom).result),
        //VxSe (one engine inoperative, and feathered, flaps up)
        'VxSe': calculateVxSe(rocAltitude, isaDeviation, tom),
        'rocVxSe': calculateRocVxSe(rocAltitude, isaDeviation, tom),
        'gradVxSe': calculateGradientVxSe(rocAltitude, isaDeviation, tom),
        'angleVxSe': calculateAngle(calculateGradientVxSe(rocAltitude,isaDeviation,tom).result),

        //Climb
        'minInClimb': boringMinInClimb,
        'distInClimb': distanceInMinutes(boringMinInClimb.number,boringMinInClimb.Vy.result),

        //Ceilings (one engine inoperative, and feathered, flaps up)
        'OEIserviceCeiling': calculateOEIceiling(isaDeviation,tom),
        'OEIabsoluteCeiling': calculateOEIabsoluteCeiling(isaDeviation,tom)
    };

    data['ASDR'] = calculateASDR(data['takeoff'], data['landing'])

    console.log(generateTempCorrectionTable(pe,isaDeviation, daMda))

    return data;
}

/*
KNOWN BUGS:

*/