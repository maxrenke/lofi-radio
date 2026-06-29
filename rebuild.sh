docker stop lofi-radio-app 2>/dev/null || true
docker rm lofi-radio-app 2>/dev/null || true

docker build --no-cache -t lofi-radio-lofi-radio .

docker run -d \
  --name lofi-radio-app \
  -p 6969:80 \
  -v /DATA/Media/Music/C895:/usr/share/nginx/html/c895 \
  lofi-radio-lofi-radio