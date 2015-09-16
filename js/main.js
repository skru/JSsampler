(function() {

    window.AudioContext = (function(){
        return  window.AudioContext || window.mozAudioContext;
    })();
    var audioContext = new AudioContext();
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
        height: (wavesurfHeight/3.0)*2,
    }
    var looper = $('#looper');
    var mic = $('#mic');
    var pitch = document.getElementById('pitch');
    var masterMerger = audioContext.createChannelMerger(3);
    var mediaStreamSource;
    var recorder;

    var initial = true;    //keeps track of initial state
    var playing;           //keeps track of playing state
    var recording = false; //keeps track of recording state


    $("#wave").click(function (e) {
        e.preventDefault();
        if (playing) {
            wavesurfer.seekTo(scrub.val());
            wavesurfer.play();
        }
        wavesurfer.play();
        playing = true;
    });

    $("#stop").click(function (e) {
        e.preventDefault();
        wavesurfer.stop()
    });

    var pitch = $('#pitch');
    pitch.on('input', function (e) {
        e.preventDefault();
        wavesurfer.setPlaybackRate(pitch.val());
    });

    var scrub = $('#scrub');
    scrub.val(0);


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
        $('div#recording').css('display', 'none')
        $("div#record").show();

    });

    $('#looper').prop('checked', false);

    $('#looper:checkbox').change(function (e) {
        e.preventDefault();
        if (looper.is(':checked') === false) {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(scrub.val());
                playing = false;
            }); 
        } else {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(scrub.val());
                wavesurfer.play()
            });
        }
    });

    $('#mic').prop('checked', true);
    $('#mic:checkbox').change(function (e) {
        e.preventDefault();
        if (mic.is(':checked') === false) {
            mediaStreamSource.disconnect(masterMerger);
        } else {
            mediaStreamSource.connect(masterMerger);
        }
    });

    var startRecorder = function (recorder) {
        playing = true;
        recorder.clear();
        recorder.record();
    };
    var stopRecorder = function (recorder) {
        playing = false;
        recorder.stop();
        if (initial === true) {
            mediaStreamSource.disconnect(masterMerger);
            wavesurfer.init(wavesurfer_options);
            wavesurfer.backend.setFilter(masterMerger);          
        } 
        initial = false;
        recorder.exportWAV(function (e) {
            wavesurfer.loadBlob(e);
        });
        $('#mic').prop('checked', false);
    };



    var onSuccess = function (stream) {
        $("canvas").css("display", "block");
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(masterMerger);
        recorder = new Recorder(masterMerger, {
            workerPath: "js/recorderWorker.js"
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
    







