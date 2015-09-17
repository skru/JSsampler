(function() {
    window.AudioContext = (function(){
        return  window.AudioContext || window.mozAudioContext;
    })();
    var audioContext = new AudioContext();
    var tuna = new Tuna(audioContext);
    var wavesurfer = Object.create(WaveSurfer);
    var wavesurfHeight = document.getElementById('canvas-wrapper').offsetHeight;
    var wavesurfer_options = {
        container: document.querySelector('#wave'),
        waveColor: '#f6a828',
        progressColor: 'white',
        cursorColor: '#f6a828',
        cursorWidth: '5',
        hideScrollbar: true,
        normalize: false,
        audioContext: audioContext,
        interact: false,
        height: (wavesurfHeight)
    }
    var looper = $('#looper');
    var mic = $('#mic');
    var micMute = $('#micMute');

    var masterMerger = audioContext.createChannelMerger(2);
    var mediaStreamSource;
    var recorder;

    var masterVolume = audioContext.createGain();
    masterVolume.gain.value = 0;
    var splitter = audioContext.createChannelSplitter(2);
    var recordVolume = audioContext.createGain();
    recordVolume.gain.value = 1;

    var start = 0;
    var finish = 1;




    var initial = true;    //keeps track of initial state
    var playing;           //keeps track of playing state
    var recording = false; //keeps track of recording state

///////////////////////////////////////////////////////////
///////////// DELAY ///////////////////////////////////////
    var de = ['killer']
    var delay = new tuna.Delay();
    $('#delay-time').slider({
        value: 20,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.delayTime.value = ui.value/100;
        }

    }).slider("pips", {
        labels: ['Time'],
        step: 20
    });

    $('#delay-feed').slider({
        value: 50,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.feedback.value = ui.value/100;
        }
    }).slider("pips", {
        labels: ['Feedback'],
        step: 20
    });
    $('#delay-cutoff').slider({
        value: 100,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.cutoff.value = (ui.value/100) * 22050;
        }
    }).slider("pips", {
        labels: ['Cutoff'],
        step: 20
    });
    $('#delay-wet').slider({
        value: 100,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.wetLevel.value = ui.value/100;
        }
    }).slider("pips", {
        labels: ['Wet'],
        step: 20
    });
    $('#delay-dry').slider({
        value: 100,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.dryLevel.value = ui.value/100;
        }
    }).slider("pips", {
        labels: ['Dry'],
        step: 20
    });
    delay.feedback.value = $('#delay-time').slider( "option", "value" )/100;
    delay.delayTime.value = $('#delay-feed').slider( "option", "value" )/100;
    delay.cutoff.value = ($('#delay-cutoff').slider( "option", "value" )/100) * 22050;
    delay.dryLevel.value = $('#delay-wet').slider( "option", "value" )/100;
    delay.wetLevel.value = $('#delay-dry').slider( "option", "value" )/100;
////////////////////////////////////////////////////////
///////////////////////////////////////////////////////

    $("#wave").click(function (e) {
        e.preventDefault();
        if (playing) {
            wavesurfer.seekTo(start);
            wavesurfer.play(start,finish * wavesurfer.getDuration());
        }
        wavesurfer.play(start, finish * wavesurfer.getDuration());
        playing = true;
    });

    $("#stop").click(function (e) {
        e.preventDefault();
        wavesurfer.stop()
        wavesurfer.seekTo(start);
        playing = false;
    });

    // var volume = $('#volume');
    // volume.hide(); 
    // volume.on('input', function (e) {
    //     e.preventDefault();
    //     masterVolume.gain.value = volume.val();
    //     ////
    // });

    $('#slider-volume').slider({
        value: 100,
        min: 0,
        max: 120,
        step: 0.1,
        range: "min",
        animate: true,
        slide: function( event, ui ) {
            masterVolume.gain.value = ui.value/100;
        }

    }).slider("pips", {
        labels: ['Volume'],
        step: 100
    });

    $('#slider-pitch').slider({
        value: 1,
        min: 0,
        max: 2,
        step: 0.01,
        range: "min",
        animate: true,
        slide: function( event, ui ) {
            wavesurfer.setPlaybackRate(ui.value);
        }

    }).slider("pips", {
        labels: ['Pitch'],
        step: 100
    });

    $("#record").click(function (e) {
        e.preventDefault();
        recording = true;
        startRecorder(recorder);
        $("#record").hide();
        $('#recording').show();
    });

    $('#recording').hide();
    $('#recording').click(function (e) {
        e.preventDefault();
        stopRecorder(recorder);
        recording = false;
        $('#recording').hide();
        $("#record").show();

    });
    
    $('#looper').prop('checked', false);
    $('#looper:checkbox').change(function (e) {
        e.preventDefault();
        if (looper.is(':checked') === false) {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(start);
                playing = false;
            }); 
        } else {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.play(start, finish * wavesurfer.getDuration());
            });
        }
    });

    $('#mic').prop('checked', true);
    $('#mic:checkbox').change(function (e) {
        e.preventDefault();
        if (mic.is(':checked') === false) {
            mediaStreamSource.disconnect(masterMerger);
            if (micMute.is(':checked')) {
                masterVolume.gain.value = 5; 
                volume.val(5); 
            };
        } else {
            mediaStreamSource.connect(masterMerger);
             if (micMute.is(':checked')) {
                masterVolume.gain.value = 0; 
                volume.val(0); 
            };
        };
    });

    $('#delay').prop('checked', false);
    $('#delay:checkbox').change(function (e) {
        e.preventDefault();
        if ($('#delay').is(':checked')) {
            masterMerger.disconnect(splitter)
            masterMerger.connect(delay.input);
            delay.connect(splitter);
        } else {
            delay.disconnect(splitter);
            masterMerger.disconnect(delay.input);
            masterMerger.connect(splitter);
        };
    });

    $( "#slider-range" ).slider({
        range: true,
        min: 0,
        max: 1000,
        animate: true,
        values: [ 0, 1000 ],
        slide: function( event, ui ) {
            start = (ui.values[0] / 1000.0) * wavesurfer.getDuration();
            finish = (ui.values[1] / 1000.0);
            if (!playing) {
                wavesurfer.seekTo(start);
            }
        }
    }).slider("pips", {
        labels: ['Loop'],
        step: 100
    });

    $( "#record-btn" ).button({
      icons: {
        primary: "ui-icon-locked"
      },
      text: false
    });
    $( "#check" ).button();

    var startRecorder = function (recorder) {
        recorder.clear();
        recorder.record();
        if (!initial) {
            wavesurfer.play();
        }
        playing = true;
    };
    var stopRecorder = function (recorder) {
        playing = false;
        recorder.stop();
        if (initial === true) {
            mediaStreamSource.disconnect(recordVolume);
            wavesurfer.init(wavesurfer_options);

            wavesurfer.backend.setFilter(masterMerger); 
            masterMerger.connect(splitter);
            splitter.connect(masterVolume);
            masterVolume.connect(audioContext.destination);
            splitter.connect(recordVolume);

            wavesurfer.setVolume(0); //mutes ac.destination
            masterVolume.gain.value = 5; //maintains equal volume when recording?
            // volume.val(5); 
            // volume.show();
        } 
        initial = false;
        recorder.exportWAV(function (e) {
            wavesurfer.loadBlob(e);
        });
        $('#mic').prop('checked', false);
        wavesurfer.setPlaybackRate(1);
        wavesurfer.seekTo(0);
        //scrub.val(0);
    };



    var onSuccess = function (stream) {
        $("canvas").css("display", "block");
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(recordVolume);
        recorder = new Recorder(recordVolume, {
            workerPath: "js/recorderWorker.js",
            bufferLen: 4096
        });
    };


// Gets microphone. inits with onSuccess
    navigator.getUserMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);
    var constraints = { 
        video: false,
        audio: true
    };
    if (navigator.getUserMedia) {
        navigator.getUserMedia (
        constraints,
        onSuccess,
        function (error) {
            $("body").text("Error: you need to allow var sample to use the microphone.",error)
        });
    };
})();
    







