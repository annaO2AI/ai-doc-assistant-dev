// PatientVoiceEnrollRegistration.tsx (Updated)

import React, { useState } from "react"
import { MicOff, Mic, AlertCircle, ArrowLeft } from "lucide-react"
import { useAudioRecording } from "../hooks/useAudioRecording";
import { APIService } from "../service/api";
import Image from "next/image";

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  id: number
  onSuccess: () => void   // This will now trigger Step 3 in parent
}

const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
  // Decode the audio blob into an AudioBuffer, convert to WAV ArrayBuffer and return as Blob
  const arrayBuffer = await audioBlob.arrayBuffer();
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  // decodeAudioData may return a Promise or require callbacks; using promise form
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const wavArrayBuffer = audioBufferToWav(audioBuffer);
  // Optionally close the audio context if supported
  if (typeof audioCtx.close === "function") {
    try {
      audioCtx.close();
    } catch {
      // ignore
    }
  }
  return new Blob([wavArrayBuffer], { type: "audio/wav" });
}
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
    offset += s.length;
  };

  // RIFF chunk descriptor
  writeString("RIFF");
  view.setUint32(offset, totalSize - 8, true);
  offset += 4;
  writeString("WAVE");

  // fmt subchunk
  writeString("fmt ");
  view.setUint32(offset, 16, true); // Subchunk1Size (16 for PCM)
  offset += 4;
  view.setUint16(offset, 1, true); // AudioFormat (1 = PCM)
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;

  // data subchunk
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return arrayBuffer;
}

export const PatientVoiceEnrollRegistration: React.FC<ModalProps> = ({ 
  onClose, 
  id, 
  onSuccess   // <-- Now used properly
}) => {
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useAudioRecording()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState(false)

  const handleStartEnrollment = async () => {
    setError(null)
    setEnrollmentStatus(true)
    await startRecording()
  }

  const handleStopEnrollment = async () => {
    const audioBlob = await stopRecording()
    if (!audioBlob) {
      setError("Failed to capture audio")
      return
    }

    setIsLoading(true)
    try {
      const wavBlob = await convertToWav(audioBlob)
      const audioFile = new File([wavBlob], `${id}.wav`, { type: "audio/wav" })

      const response = await APIService.enrollPatientVoice(id, audioFile)
      
      if (response) {
        // Success! Trigger parent success handler → goes to Step 3
        onSuccess()
      }
    } catch (err) {
      setError(
        `Failed to enroll voice: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    } finally {
      setIsLoading(false)
      setEnrollmentStatus(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-white hover:text-gray-200 absolute top-[-20px] left-[-10px] text-sm"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </button>

      <div className="w-full max-w-2xl mx-auto text-center">
        {!enrollmentStatus ? (
          <button onClick={handleStartEnrollment} className="block mx-auto">
            <Image
              src="/Recode.svg"
              alt="Start Recording"
              width={400}
              height={300}
            />
          </button>
        ) : (
          <button onClick={handleStopEnrollment} className="block mx-auto">
            <Image
              src="/Record-Stop.svg"
              alt="Stop Recording"
              width={400}
              height={300}
            />
            <span className="block mt-[-20px] text-white font-medium">
              {isLoading ? "Saving..." : `Stop Recording (${recordingTime}s)`}
            </span>
          </button>
        )}

        <h3 className="text-2xl font-semibold mb-4 mt-6 text-white">Tap to Record</h3>
        <p className="text-lg mb-10 leading-relaxed text-white">
          Please read the following text clearly:
          <br />
          <span className="font-bold text-xl block mt-4">
            &quot;Hey O2AI, I agree to enable voice recognition. I am here for a health checkup today. 
            I understand this voice will be saved securely. Thank you, I have completed the recording&quot;
          </span>
        </p>

        <div className="space-y-4">
          {!enrollmentStatus ? (
            <button
              onClick={handleStartEnrollment}
              disabled={isLoading}
              className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              <Mic className="w-6 h-6" />
              <span className="font-medium">{isLoading ? "Processing..." : "Start Recording"}</span>
            </button>
          ) : (
            <button
              onClick={handleStopEnrollment}
              className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <MicOff className="w-6 h-6" />
              <span className="font-medium">
                {isLoading ? "Saving..." : `Stop Recording (${recordingTime}s)`}
              </span>
              {isLoading && (
               <Image
                  src="/loading-svgrepo-com.svg"
                  alt="Start Recording"
                  width={20}
                  height={20}
                />
              )}
            </button>
          )}

          {enrollmentStatus && (
            <div className="text-white flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <span>Recording in progress... Speak clearly</span>
            </div>
          )}

          {(error || recordingError) && (
            <div className="mt-4 flex items-center gap-2 text-red-300 bg-red-900/30 p-4 rounded-lg max-w-sm mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error || recordingError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}