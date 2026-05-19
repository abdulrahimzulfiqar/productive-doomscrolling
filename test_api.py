from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
import os

proxy_user = "brlgcczz-rotate"
proxy_pass = "5sydjejvagfa"
proxy_config = WebshareProxyConfig(proxy_user, proxy_pass)
api = YouTubeTranscriptApi(proxy_config=proxy_config)
t_list = api.list("OEQ951iOBWU")
print("✅ Succeeded with WebshareProxyConfig!")
