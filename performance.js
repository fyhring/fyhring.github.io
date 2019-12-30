
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
    msaInput;

$(document).ready(function()
{
    $('#performanceForm input').on('change', function(e)
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
        (weightInput == null)
    ) {

        var takeOffLandingUIPairs = [
            ['to-groundroll', null, 'm'],
            ['to-distance', null, 'm'],
            ['ldg-groundroll', null, 'm'],
            ['ldg-distance', null, 'm']
        ];
    
        updateUIValues(takeOffLandingUIPairs);

        return false;
    }

    // Temp ISA Deviation
    var tempIsaDeviation = temperatureInput - 15;

    // Calculate pressure altitude of AD elevation.
    var pressureElevation = elevationInput,
        pressureAltitude  = cruiseInput;

    if (pressureInput != STD_PRESSURE) {

        pressureElevation = toPressureAltitude(elevationInput);

        // If we use FL we don't correct for pressure.
        if (!useFL) {
            pressureAltitude = toPressureAltitude(cruiseInput);
        } else {
            pressureAltitude = cruiseInput * 100;
        }

        // Pressure Elevation must not be less than 0, no data in matrix below 0.
        if (pressureElevation < 0) {
            pressureElevation = 0;
        }
    }

    var data = calculateAll(pressureElevation, pressureAltitude, msaInput, tempIsaDeviation, weightInput);
    console.log(data);

    data.env = {
        qnh: pressureInput,
        temp: temperatureInput,
        isaDev: tempIsaDeviation,
        weight: weightInput,
        elevation: elevationInput,
        pressureElevation: pressureElevation,
        cruiseAlt: cruiseInput,
        cruisePressureAltitude: pressureAltitude,
        rocAlt: null,
        rocPressureAlt: data.rocVySe.keys.alt3
    };

    var temperatures = Object.keys(data.takeoff.uncorrectedGround.data['1D1']);
    var weights = Object.keys(data.takeoff.uncorrectedGround.data['2D']);

    var takeOffLandingUIPairs = {
        'to-groundroll': [Math.ceil(data.takeoff.groundroll), 'm'],
        'to-distance': [Math.ceil(data.takeoff.distance), 'm'],
        'ldg-groundroll': [Math.ceil(data.landing.groundroll), 'm'],
        'ldg-distance': [Math.ceil(data.landing.distance), 'm'],
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
        'roc-vy-temp1': [data.rocVy.keys.temp1, '&deg;C'],
        'roc-vy-temp2': [data.rocVy.keys.temp2, '&deg;C'],
        'roc-vy-temp3': [data.rocVy.keys.temp3, '&deg;C'],
        'roc-vy-alt1': [data.rocVy.keys.alt1, 'ft'],
        'roc-vy-alt2': [data.rocVy.keys.alt2, 'ft'],
        'roc-vy-alt3': [Math.round(data.rocVy.keys.alt3), 'ft'],
        'roc-vy-mass1': [data.rocVy.keys.mass1, 'kg'],
        'roc-vy-mass2': [data.rocVy.keys.mass2, 'kg'],
        'roc-vy-mass3': [data.rocVy.keys.mass3, 'kg'],

        // Environment
        'env-qnh': [data.env.qnh, 'hPa'],
        'env-temp': [data.env.temp, '&deg;'],
        'env-isa-dev': [data.env.isaDev, ''],
        'env-weight': [data.env.weight, 'kg'],
        'env-elevation': [data.env.elevation, 'ft'],
        'env-pressure-elevation': [data.env.pressureElevation, 'ft'],
        'env-cruise-alt': [data.env.cruiseAlt, 'ft'],
        'env-cruise-pressure-alt': [data.env.cruisePressureAltitude, 'ft'],
        'env-roc-alt': [data.env.rocAlt, 'ft'],
        'env-pressure-roc-alt': [Math.round(data.env.rocPressureAlt), 'ft'],

        // T/O Groundroll
        'to-g-w1-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'to-g-w1-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'to-g-w1-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'to-g-w1-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'to-g-w1-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]]), 'm'],
        'to-g-w1-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]]), 'm'],
        'to-g-w1-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedGround.data['2D'][weights[1]]), 'm'],

        'to-g-w2-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'to-g-w2-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'to-g-w2-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'to-g-w2-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'to-g-w2-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]]), 'm'],
        'to-g-w2-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]]), 'm'],
        'to-g-w2-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedGround.data['2D'][weights[0]]), 'm'],

        'to-g-w3-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedGround.data['3D']['result']), 'm'],

        // Ldg Groundroll
        'ldg-g-w1-alt1-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-g-w1-alt1-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-g-w1-alt2-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-g-w1-alt2-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-g-w1-alt3-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[0]]), 'm'],
        'ldg-g-w1-alt3-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D1'][temperatures[1]]), 'm'],
        'ldg-g-w1-alt3-temp3': [Math.ceil(data.landing.uncorrectedGround.data['2D'][weights[1]]), 'm'],

        'ldg-g-w2-alt1-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-g-w2-alt1-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-g-w2-alt2-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-g-w2-alt2-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-g-w2-alt3-temp1': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[0]]), 'm'],
        'ldg-g-w2-alt3-temp2': [Math.ceil(data.landing.uncorrectedGround.data['1D2'][temperatures[1]]), 'm'],
        'ldg-g-w2-alt3-temp3': [Math.ceil(data.landing.uncorrectedGround.data['2D'][weights[0]]), 'm'],

        'ldg-g-w3-alt3-temp3': [Math.ceil(data.landing.uncorrectedGround.data['3D']['result']), 'm'],

        // T/O Distance
        'to-d-w1-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'to-d-w1-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'to-d-w1-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'to-d-w1-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'to-d-w1-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[0]]), 'm'],
        'to-d-w1-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D1'][temperatures[1]]), 'm'],
        'to-d-w1-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedDist.data['2D'][weights[1]]), 'm'],

        'to-d-w2-alt1-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'to-d-w2-alt1-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'to-d-w2-alt2-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'to-d-w2-alt2-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'to-d-w2-alt3-temp1': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[0]]), 'm'],
        'to-d-w2-alt3-temp2': [Math.ceil(data.takeoff.uncorrectedDist.data['1D2'][temperatures[1]]), 'm'],
        'to-d-w2-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedDist.data['2D'][weights[0]]), 'm'],

        'to-d-w3-alt3-temp3': [Math.ceil(data.takeoff.uncorrectedDist.data['3D']['result']), 'm'],

        // Ldg Distance
        'ldg-d-w1-alt1-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-d-w1-alt1-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-d-w1-alt2-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-d-w1-alt2-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-d-w1-alt3-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[0]]), 'm'],
        'ldg-d-w1-alt3-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D1'][temperatures[1]]), 'm'],
        'ldg-d-w1-alt3-temp3': [Math.ceil(data.landing.uncorrectedDist.data['2D'][weights[1]]), 'm'],

        'ldg-d-w2-alt1-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'ldg-d-w2-alt1-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'ldg-d-w2-alt2-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'ldg-d-w2-alt2-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'ldg-d-w2-alt3-temp1': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[0]]), 'm'],
        'ldg-d-w2-alt3-temp2': [Math.ceil(data.landing.uncorrectedDist.data['1D2'][temperatures[1]]), 'm'],
        'ldg-d-w2-alt3-temp3': [Math.ceil(data.landing.uncorrectedDist.data['2D'][weights[0]]), 'm'],

        'ldg-d-w3-alt3-temp3': [Math.ceil(data.landing.uncorrectedDist.data['3D']['result']), 'm'],

        // T/O Corrections
        'to-corrections-paved-rwy': [Math.ceil(data.takeoff.corrections.pavedRwyCorrection), 'm'],
        'to-corrections-sloped-rwy': [Math.ceil(data.takeoff.corrections.slopeCorrection), 'm'],
        'to-corrections-soft-rwy': [Math.ceil(data.takeoff.corrections.softSfcCorrection), 'm'],
        'to-corrections-windlabel': [(Math.ceil((Math.abs(getWindComponents().head))*10))/10,'kts '+(getWindComponents().head > 0 ? 'headwind' : 'tailwind')],
        'to-corrections-wind': [Math.ceil(data.takeoff.corrections.windCorrection), 'm'],
        'to-corrections-combined': [floorOrCeil(data.takeoff.corrections.combined), 'm'],
        //Corrected distances
        'to-g-corrected': [Math.ceil(data.takeoff.uncorrectedGround.data['3D']['result'] + data.takeoff.corrections.combined), 'm'],
        'to-d-corrected': [Math.ceil(data.takeoff.uncorrectedDist.data['3D']['result'] + data.takeoff.corrections.combined), 'm'],
        //Factorized distances
        'to-g-final': [Math.ceil(data.takeoff.groundroll), 'm'],
        'to-d-final': [Math.ceil(data.takeoff.distance), 'm'],

        // Ldg Corrections
        'ldg-corrections-paved-rwy': [Math.ceil(data.landing.corrections.pavedRwyCorrection), 'm'],
        'ldg-corrections-sloped-rwy': [Math.ceil(data.landing.corrections.slopeCorrection), 'm'],
        'ldg-corrections-soft-rwy': [Math.ceil(data.landing.corrections.softSfcCorrection), 'm'],
        'ldg-corrections-windlabel': [(Math.ceil((Math.abs(getWindComponents().head))*10))/10,'kts '+(getWindComponents().head > 0 ? 'headwind' : 'tailwind')],
        'ldg-corrections-wind': [Math.ceil(data.landing.corrections.windCorrection), 'm'],
        'ldg-corrections-combined': [floorOrCeil(data.landing.corrections.combined), 'm'],
        //Corrected distances
        'ldg-g-corrected': [Math.ceil(data.landing.uncorrectedGround.data['3D']['result'] + data.landing.corrections.combined), 'm'],
        'ldg-d-corrected': [Math.ceil(data.landing.uncorrectedDist.data['3D']['result'] + data.landing.corrections.combined), 'm'],
        //Factorized distances
        'ldg-g-final': [Math.ceil(data.landing.groundroll), 'm'],
        'ldg-d-final': [Math.ceil(data.landing.distance), 'm'],

        //CLIMB PERFORMANCE OUTPUTS

        // ROC Vy
        'roc-vy-w1-alt1-temp1': [Math.floor(data.rocVy.data['1D1'][temperatures[0]+'-raw'][1]), 'fpm'],
        'roc-vy-w1-alt1-temp2': [Math.floor(data.rocVy.data['1D1'][temperatures[1]+'-raw'][1]), 'fpm'],
        'roc-vy-w1-alt2-temp1': [Math.floor(data.rocVy.data['1D1'][temperatures[0]+'-raw'][0]), 'fpm'],
        'roc-vy-w1-alt2-temp2': [Math.floor(data.rocVy.data['1D1'][temperatures[1]+'-raw'][0]), 'fpm'],
        'roc-vy-w1-alt3-temp1': [Math.floor(data.rocVy.data['1D1'][temperatures[0]]), 'fpm'],
        'roc-vy-w1-alt3-temp2': [Math.floor(data.rocVy.data['1D1'][temperatures[1]]), 'fpm'],
        'roc-vy-w1-alt3-temp3': [Math.floor(data.rocVy.data['2D'][weights[1]]), 'fpm'],

        'roc-vy-w2-alt1-temp1': [Math.floor(data.rocVy.data['1D2'][temperatures[0]+'-raw'][1]), 'fpm'],
        'roc-vy-w2-alt1-temp2': [Math.floor(data.rocVy.data['1D2'][temperatures[1]+'-raw'][1]), 'fpm'],
        'roc-vy-w2-alt2-temp1': [Math.floor(data.rocVy.data['1D2'][temperatures[0]+'-raw'][0]), 'fpm'],
        'roc-vy-w2-alt2-temp2': [Math.floor(data.rocVy.data['1D2'][temperatures[1]+'-raw'][0]), 'fpm'],
        'roc-vy-w2-alt3-temp1': [Math.floor(data.rocVy.data['1D2'][temperatures[0]]), 'fpm'],
        'roc-vy-w2-alt3-temp2': [Math.floor(data.rocVy.data['1D2'][temperatures[1]]), 'fpm'],
        'roc-vy-w2-alt3-temp3': [Math.floor(data.rocVy.data['2D'][weights[0]]), 'fpm'],

        'roc-vy-w3-alt3-temp3': [Math.floor(data.rocVy.data['3D']['result']), 'fpm'],
        
        // OEI ROC VySE
        'oei-roc-vyse-w1-alt1-temp1': [Math.floor(data.rocVySe.data['1D1'][temperatures[0]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w1-alt1-temp2': [Math.floor(data.rocVySe.data['1D1'][temperatures[1]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w1-alt2-temp1': [Math.floor(data.rocVySe.data['1D1'][temperatures[0]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w1-alt2-temp2': [Math.floor(data.rocVySe.data['1D1'][temperatures[1]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w1-alt3-temp1': [Math.floor(data.rocVySe.data['1D1'][temperatures[0]]), 'fpm'],
        'oei-roc-vyse-w1-alt3-temp2': [Math.floor(data.rocVySe.data['1D1'][temperatures[1]]), 'fpm'],
        'oei-roc-vyse-w1-alt3-temp3': [Math.floor(data.rocVySe.data['2D'][weights[1]]), 'fpm'],

        'oei-roc-vyse-w2-alt1-temp1': [Math.floor(data.rocVySe.data['1D2'][temperatures[0]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w2-alt1-temp2': [Math.floor(data.rocVySe.data['1D2'][temperatures[1]+'-raw'][1]), 'fpm'],
        'oei-roc-vyse-w2-alt2-temp1': [Math.floor(data.rocVySe.data['1D2'][temperatures[0]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w2-alt2-temp2': [Math.floor(data.rocVySe.data['1D2'][temperatures[1]+'-raw'][0]), 'fpm'],
        'oei-roc-vyse-w2-alt3-temp1': [Math.floor(data.rocVySe.data['1D2'][temperatures[0]]), 'fpm'],
        'oei-roc-vyse-w2-alt3-temp2': [Math.floor(data.rocVySe.data['1D2'][temperatures[1]]), 'fpm'],
        'oei-roc-vyse-w2-alt3-temp3': [Math.floor(data.rocVySe.data['2D'][weights[0]]), 'fpm'],

        'oei-roc-vyse-w3-alt3-temp3': [Math.floor(data.rocVySe.data['3D']['result']), 'fpm'],

    };
    console.log(data.rocVySe.data);

    updateUIValues(takeOffLandingUIPairs);

    /**********************
     * Math Jax Equations *
     **********************/

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
    $('.to-g-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['to-mass1'][0] +'kg - '+ takeOffLandingUIPairs['to-mass2'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['to-mass3'][0] +'kg - '+ takeOffLandingUIPairs['to-mass2'][0] +'kg) + '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0] +'m', {display: true}));

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
    $('.to-d-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['to-d-w1-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['to-d-w2-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['to-mass1'][0] +'kg - '+ takeOffLandingUIPairs['to-mass2'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['to-mass3'][0] +'kg - '+ takeOffLandingUIPairs['to-mass2'][0] +'kg) + '+ takeOffLandingUIPairs['to-d-w2-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['to-d-w3-alt3-temp3'][0] +'m', {display: true}));

    //Corrections
    $('.to-correction-paved-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m \\cdot -6\\% = '+ takeOffLandingUIPairs['to-corrections-paved-rwy'][0]+'m', {display: true}));
    $('.to-correction-slope-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m \\cdot ('+ (data.takeoff.corrections.slope * 100) +'\\%/1\\%) \\cdot 5\\% = '+ takeOffLandingUIPairs['to-corrections-sloped-rwy'][0]+'m', {display: true}));
    $('.to-correction-soft-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['to-g-w3-alt3-temp3'][0]+'m \\cdot '+ ((useSoftSfc)?'\\25%' : '0\\%') +' = '+ takeOffLandingUIPairs['to-corrections-soft-rwy'][0]+'m', {display: true}));
    $('.to-correction-wind-equation').html(MathJax.tex2svg((getWindComponents().head>0 ? '-2.5m \\cdot '+ (Math.ceil((Math.abs(getWindComponents().head))*10))/10 +'kts' : '10m \\cdot ' + Math.ceil(-1 * getWindComponents().head) + 'kts')+' = '+ takeOffLandingUIPairs['to-corrections-wind'][0]+'m', {display: true}));

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
    $('.ldg-d-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-d-w1-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-mass1'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass2'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['ldg-mass3'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass2'][0] +'kg) + '+ takeOffLandingUIPairs['ldg-d-w2-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-w3-alt3-temp3'][0] +'m', {display: true}));

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
    $('.ldg-g-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['ldg-g-w1-alt3-temp3'][0] +'m - '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp3'][0] +'m }{ '+ takeOffLandingUIPairs['ldg-mass1'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass2'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['ldg-mass3'][0] +'kg - '+ takeOffLandingUIPairs['ldg-mass2'][0] +'kg) + '+ takeOffLandingUIPairs['ldg-g-w2-alt3-temp3'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0] +'m', {display: true}));

    //Corrections
    $('.ldg-correction-paved-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m \\cdot -6\\% = '+ takeOffLandingUIPairs['ldg-corrections-paved-rwy'][0]+'m', {display: true}));
    $('.ldg-correction-slope-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m \\cdot ('+ (data.takeoff.corrections.slope * 100) +'\\%/1\\%) \\cdot 5\\% = '+ takeOffLandingUIPairs['ldg-corrections-sloped-rwy'][0]+'m', {display: true}));
    $('.ldg-correction-soft-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m \\cdot '+ ((useSoftSfc)?'\\25%' : '0\\%') +' = '+ takeOffLandingUIPairs['ldg-corrections-soft-rwy'][0]+'m', {display: true}));
    var roundedHeadWindComponent = Math.ceil(Math.abs(getWindComponents().head)*10)/10
    console.log(roundedHeadWindComponent)
    $('.ldg-correction-wind-equation').html(MathJax.tex2svg((getWindComponents().head>0 ? '-2.5m \\cdot '+ roundedHeadWindComponent +'kts' : '10m \\cdot ' + (-1 * getWindComponents().head) + 'kts')+' = '+ takeOffLandingUIPairs['ldg-corrections-wind'][0]+'m', {display: true}));

    //Corrected
    $('.ldg-g-corrected-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-w3-alt3-temp3'][0]+'m + '+ takeOffLandingUIPairs['ldg-corrections-combined'][0] +'m = '+ takeOffLandingUIPairs['ldg-g-corrected'][0]+'m', {display: true}));
    $('.ldg-d-corrected-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-d-w3-alt3-temp3'][0]+'m + '+ takeOffLandingUIPairs['ldg-corrections-combined'][0] +'m = '+ takeOffLandingUIPairs['ldg-d-corrected'][0]+'m', {display: true}));

    //Factorized
    $('.ldg-g-factorized-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-g-corrected'][0]+'m \\cdot 1.43 = '+ takeOffLandingUIPairs['ldg-g-final'][0]+'m', {display: true}));
    $('.ldg-d-factorized-equation').html(MathJax.tex2svg(takeOffLandingUIPairs['ldg-d-corrected'][0]+'m \\cdot 1.43 = '+ takeOffLandingUIPairs['ldg-d-final'][0]+'m', {display: true}));

// WIP

    //RoC Vy
    //Interpolation between altitudes for mass1, temp1&2
    $('.roc-vy-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.roc-vy-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass1
    $('.roc-vy-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['roc-vy-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.roc-vy-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.roc-vy-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-alt2'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['roc-vy-alt3'][0] +'ft - '+ takeOffLandingUIPairs['roc-vy-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['roc-vy-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass2
    $('.roc-vy-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['roc-vy-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['roc-vy-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between mass
    $('.roc-vy-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['roc-vy-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['roc-vy-mass1'][0] +'kg - '+ takeOffLandingUIPairs['roc-vy-mass2'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['roc-vy-mass3'][0] +'kg - '+ takeOffLandingUIPairs['roc-vy-mass2'][0] +'kg) + '+ takeOffLandingUIPairs['roc-vy-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['roc-vy-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));


    //OEI RoC VySe
    //Interpolation between altitudes for mass1, temp1&2
    $('.oei-roc-vyse-w1-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt2-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt1-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.oei-roc-vyse-w1-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt2-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt1-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass1
    $('.oei-roc-vyse-w1-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between altitudes for mass2 temp1&2
    $('.oei-roc-vyse-w2-temp1-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt2-temp1'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt1-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp1'][0] +'\\tfrac{ft}{min}', {display: true}));
    $('.oei-roc-vyse-w2-temp2-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt2-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-alt2'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-alt3'][0] +'ft - '+ takeOffLandingUIPairs['oei-roc-vyse-alt1'][0] +'ft) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt1-temp2'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp2'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between temperatures for mass2
    $('.oei-roc-vyse-w2-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp2'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-temp2'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp1'][0] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-temp3'][0] +'^\\circ C - '+ takeOffLandingUIPairs['oei-roc-vyse-temp1'][0] +'^\\circ C) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp1'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));
    //Interpolation between masses
    $('.oei-roc-vyse-w3-temp3-equation').html(MathJax.tex2svg('\\frac{ '+ takeOffLandingUIPairs['oei-roc-vyse-w1-alt3-temp3'][0] +'\\tfrac{ft}{min} - '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} }{ '+ takeOffLandingUIPairs['oei-roc-vyse-mass1'][0] +'kg - '+ takeOffLandingUIPairs['oei-roc-vyse-mass2'][0] +'kg } \\cdot ('+ takeOffLandingUIPairs['oei-roc-vyse-mass3'][0] +'kg - '+ takeOffLandingUIPairs['oei-roc-vyse-mass2'][0] +'kg) + '+ takeOffLandingUIPairs['oei-roc-vyse-w2-alt3-temp3'][0] +'\\tfrac{ft}{min} = '+ takeOffLandingUIPairs['oei-roc-vyse-w3-alt3-temp3'][0] +'\\tfrac{ft}{min}', {display: true}));

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
    var headwindComponent =  Math.cos(toRadians(windDirInput - rwyDirInput)) * windSpdInput;
    var crosswindComponent = Math.sin(toRadians(windDirInput - rwyDirInput)) * windSpdInput;

    if (isNaN(headwindComponent)) {
        headwindComponent = 0;
    }

    if (isNaN(crosswindComponent)) {
        crosswindComponent = 0;
    }

    return {
        'head': headwindComponent,
        'cross': crosswindComponent
    };
}

function toTrueAltitude(pa) {
    return pa + ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT)
}

function toPressureAltitude(ta) {
    return ta - ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT)
}

function toDegrees (angle) {
    return angle * (180 / Math.PI);
}

function toRadians (angle) {
    return angle * (Math.PI / 180);
}


// Functions for interpolation

function findKeysForInterpolation(needle, haystack)
{
    var largerThan = [],
        lessThan   = [];
        
    
    for (var i in haystack) {
        if (typeof haystack[i] == 'string' && haystack[i].toLowerCase() == 'spacing') {
            continue;
        }
        if (haystack[i] >= needle) {
            largerThan.push(parseInt(haystack[i], 10));
        } else {
            lessThan.push(parseInt(haystack[i], 10));
        }
    }

    return [Math.min(...largerThan), Math.max(...lessThan)];
}

function findDataValuesInDataset(needle, dataset, keys)
{
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

    var interpolationData2D = {
        [mass1]: interpolate1D(degreeInput, interpolationData1D1, degreeKeys2),
        [mass2]: interpolate1D(degreeInput, interpolationData1D2, degreeKeys2),

        [mass1 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D1, degreeKeys2),
        [mass2 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2, degreeKeys2),
    };

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
            'temp1': degree2,
            'temp2': degree1,
            'temp3': degreeInput,
            'alt1': pressureAltitude2 * matrixData.spacing,
            'alt2': pressureAltitude1 * matrixData.spacing,
            'alt3': pressureAltitudeInput,
            'altSpacing': matrixData.spacing
        }
    };
};

function calculateGradient(roc,gs){
    return roc / (gs / 60 * 6076)
}

// Functions for specifics

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
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVyMatrix)
}

function calculateRocVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVxMatrix)
}

function calculateRocVySe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15;
    return interpolate3D(pa, sfcTemp, tom, ROCVySeMatrix);
}

function calculateRocVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15;
    return interpolate3D(pa, sfcTemp, tom, ROCVxSeMatrix)
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
    var serviceCeiling = 7000;
    var fpm = 1;
    while (fpm < 50) {
        fpm = calculateRocVySe(serviceCeiling, isaDeviation, tom).result;
        
        if (fpm < 50) {
            serviceCeiling -= 10;
        }
    }

    var isTopOfData = (serviceCeiling == 7000)

    //convert pressure altitude to true altitude
    serviceCeiling = toTrueAltitude(serviceCeiling)
    
    return {
        'ceiling': serviceCeiling,
        'isTopOfData': isTopOfData
    };
}

function calculateOEIabsoluteCeiling(isaDeviation, tom) {
    var absoluteCeiling = 7000;
    var fpm = -1;
    while (fpm < 0) {
        fpm = calculateRocVySe(absoluteCeiling, isaDeviation, tom).result;
        
        if (fpm < 0) {
            absoluteCeiling -= 10;
        }
    }

    var isTopOfData = (absoluteCeiling == 7000)

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

function calculateAll(pe, pa, msa, isaDeviation, tom, useTwoThirds)
{
    var rocAltitude = msa;
    if (!useMSAROC) {
        rocAltitude = (pa - pe) / 3 * 2 + pe;
    }

    return {
        //Takeoff and landing distances
        'takeoff': takeoffCorrectedCalculations(pe, isaDeviation, tom, null),
        'landing': landingCorrectedCalculations(pe, isaDeviation, tom, null),

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

        //Ceilings (one engine inoperative, and feathered, flaps up)
        'OEIserviceCeiling': calculateOEIceiling(isaDeviation,tom),
        'OEIabsoluteCeiling': calculateOEIabsoluteCeiling(isaDeviation,tom)
    };
}

/*
KNOWN BUGS:

*/