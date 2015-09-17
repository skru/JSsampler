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
        waveColor: 'red',
        progressColor: 'white',
        cursorColor: 'red',
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
    var delayfeedback = $('#dub-feedback');
    var delaytime = $('#dub-time');
    var delaywet = $('#dub-mixwet');
    var delaydry = $('#dub-mix');
    var delaycutoff = $('#dub-filter');
    var delay = new tuna.Delay();
    delay.feedback.value = delayfeedback.val();
    delay.delayTime.value = delaytime.val();
    delay.wetLevel.value = delaywet.val();
    delay.dryLevel.value = delaydry.val();
    delay.cutoff.value = delaycutoff.val();
    delaytime.on('input', function (e) {
        e.preventDefault();
        delay.delayTime.value = delaytime.val();
    });
    delayfeedback.on('input', function (e) {
        e.preventDefault();
        delay.feedback.value = delayfeedback.val();
    });
    delaycutoff.on('input', function (e) {
        e.preventDefault();
        delay.cutoff.value = delaycutoff.val();
    });
    delaydry.on('input', function (e) {
        e.preventDefault();
        delay.dryLevel.value = delaydry.val();
    });
    delaywet.on('input', function (e) {
        e.preventDefault();
        delay.wetLevel.value = delaywet.val();
    });
////////////////////////////////////////////////////////
///////////////////////////////////////////////////////

    $("#wave").click(function (e) {
        e.preventDefault();
        if (playing) {
            wavesurfer.seekTo(start);
            wavesurfer.play(start * wavesurfer.getDuration(),finish * wavesurfer.getDuration());
        }
        wavesurfer.play(start * wavesurfer.getDuration(), finish * wavesurfer.getDuration());
        playing = true;
    });

    $("#stop").click(function (e) {
        e.preventDefault();
        wavesurfer.stop()
        wavesurfer.seekTo(start);
        playing = false;
    });

    var volume = $('#volume');
    volume.hide(); 
    volume.on('input', function (e) {
        e.preventDefault();
        masterVolume.gain.value = volume.val();
        ////
    });

    var pitch = $('#pitch');
    pitch.on('input', function (e) {
        e.preventDefault();
        wavesurfer.setPlaybackRate(pitch.val());
    });

    // var scrub = $('#scrub');
    // scrub.val(0);
    // scrub.on('input', function (e) {
    //     e.preventDefault();
    //     wavesurfer.seekTo(scrub.val());
    // });

    $("div#record").click(function (e) {
        e.preventDefault();
        recording = true;
        startRecorder(recorder);
        $("div#record").hide();
        $('#recording').show();
    });

    $('div#recording').hide();
    $('div#recording').click(function (e) {
        e.preventDefault();
        stopRecorder(recorder);
        recording = false;
        $('div#recording').hide();
        $("div#record").show();

    });

    $('#looper').prop('checked', false);




    $('#looper:checkbox').change(function (e) {
        e.preventDefault();
        if (looper.is(':checked') === false) {


            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(start * wavesurfer.getDuration());
                playing = false;
            }); 
        } else {

            wavesurfer.on('finish', function () {

                wavesurfer.stop();
                wavesurfer.play(start * wavesurfer.getDuration(), finish * wavesurfer.getDuration());
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
        values: [ 0, 1000 ],
        slide: function( event, ui ) {
            start = ui.values[0] / 1000.0;
            finish = ui.values[1] / 1000.0;
            console.log(playing)
            if (!playing) {
                wavesurfer.seekTo(start);
            }
        }
    });


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
            volume.val(5); 
            volume.show();
        } 
        initial = false;
        recorder.exportWAV(function (e) {
            wavesurfer.loadBlob(e);
        });
        //console.log($('#mic').val())
        $('#mic').prop('checked', false);
        //console.log($('#mic').val())
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
    







