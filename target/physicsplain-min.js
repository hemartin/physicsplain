class t{constructor(t){this.id=t,this.rank=0,this.parent=this}}class i{constructor(){this.nodes=[]}findNode(i){if(void 0===this.nodes[i])return this.nodes[i]=new t(i),this.nodes[i];{let t=this.nodes[i];for(;t.id!==t.parent.id;)t=t.parent;return t}}find(t){return this.findNode(t).id}union(t,i){const s=this.findNode(t),n=this.findNode(i);s.id!==n.id&&(s.rank<n.rank?s.parent=n:s.rank>n.rank?n.parent=s:(n.parent=s,s.rank++))}}class s{constructor(t,i){this.x=t,this.y=i}set(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}subtract(t){return this.x-=t.x,this.y-=t.y,this}scale(t){return this.x*=t,this.y*=t,this}rotate(t){const i=Math.cos(t),s=Math.sin(t),n=this.x*i-this.y*s,e=this.x*s+this.y*i;return this.x=n,this.y=e,this}normalize(){const t=this.length();return t>0&&1!==t&&this.scale(1/t),this}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}distanceFrom(t){const i=this.x-t.x,n=this.y-t.y;return s.length(i,n)}clear(){this.x=0,this.y=0}toString(){return this.x+", "+this.y}static cross(t,i,s,n){return t*n-i*s}static dot(t,i,s,n){return t*s+i*n}static length(t,i){return Math.sqrt(t*t+i*i)}static angle(t,i){let s=Math.atan2(i,t);return s<0&&(s+=2*Math.PI),s}}class n{constructor(t){this.restitution=t,this.collisionPoints=[]}merge(t){for(const i of t.collisionPoints)this.collisionPoints.push(i)}apply(){const t=this.collisionPoints.length,i=[],n=[];let e=0,o=0,r=Number.MAX_VALUE;do{o>0&&(r=o),o=0;for(let r=0;r<t;r++){const t=this.collisionPoints[r],h=t.collidingEntity.velocity,l=t.collidingEntity.angularVelocity,a=t.impactedEntity.velocity,c=t.impactedEntity.angularVelocity,d=t.collidingEntity.origin,g=t.contactPointX-d.x,u=t.contactPointY-d.y,y=t.impactedEntity.origin,m=t.contactPointX-y.x,x=t.contactPointY-y.y,v=t.getNormalMass();let p=-l*u,f=l*g;p-=-c*x,f-=c*m,p-=a.x,f-=a.y,p+=h.x,f+=h.y,0===e&&(i[r]=p*this.restitution,n[r]=f*this.restitution);let M=(s.dot(i[r],n[r],t.normalX,t.normalY)+s.dot(p,f,t.normalX,t.normalY))*v*-1;const w=t.accumulatedImpulse;t.accumulatedImpulse=Math.max(t.accumulatedImpulse+M,0),M=t.accumulatedImpulse-w,o+=Math.abs(M);const A=t.normalX*M,V=t.normalY*M,P=t.collidingEntity.invertedMass(),X=A*P,Y=V*P,E=t.collidingEntity.invertedInertia()*s.cross(g,u,A,V),B=t.impactedEntity.invertedMass();let F=A*B,I=V*B;F=-F,I=-I;const S=-t.impactedEntity.invertedInertia()*s.cross(m,x,A,V);t.addTempVelocities(X,Y,E,F,I,S)}for(let i=0;i<t;i++)this.collisionPoints[i].applyTempVelocities();e++}while(o>.001&&e<50&&o<=r)}static mergeCollisions(t){if(t.length<=1)return t;const s=new i;for(const i of t){const t=i.collisionPoints[0];s.union(t.collidingEntity.id,t.impactedEntity.id)}const n=[];for(const i of t){const t=i.collisionPoints[0],e=s.find(t.collidingEntity.id);void 0===n[e]?n[e]=i:n[e].merge(i)}const e=[];for(const t in n)e.push(n[t]);return e}}class e{constructor(t,i,n,e,o,r,h){this.collidingEntity=t,this.impactedEntity=i,this.normalX=n,this.normalY=e,this.contactPointX=o,this.contactPointY=r,this.separation=h,this.accumulatedImpulse=0,this.nv1=new s(0,0),this.nw1=0,this.nv2=new s(0,0),this.nw2=0}getNormalMass(){const t=this.collidingEntity.origin,i=t.x-this.contactPointX,n=t.y-this.contactPointY,e=this.impactedEntity.origin,o=e.x-this.contactPointX,r=e.y-this.contactPointY;let h=s.cross(i,n,this.normalX,this.normalY);h*=h;let l=s.cross(o,r,this.normalX,this.normalY);return l*=l,1/(this.collidingEntity.invertedMass()+this.impactedEntity.invertedMass()+h*this.collidingEntity.invertedInertia()+l*this.impactedEntity.invertedInertia())}addTempVelocities(t,i,s,n,e,o){this.nv1.x+=t,this.nv1.y+=i,this.nw1+=s,this.nv2.x+=n,this.nv2.y+=e,this.nw2+=o}applyTempVelocities(){this.collidingEntity.addVelocity(this.nv1),this.collidingEntity.addAngularVelocity(this.nw1),this.impactedEntity.addVelocity(this.nv2),this.impactedEntity.addAngularVelocity(this.nw2),this.nv1.clear(),this.nw1=0,this.nv2.clear(),this.nw2=0}}class o{constructor(t){this.id=t,this.origin=new s(0,0),this.angle=0,this.dimension=new s(.1,.1),this.mass=1,this.velocity=new s(0,0),this.angularVelocity=0,this.lateralFriction=1,this.rotationalFriction=1,this.force=new s(0,0),this.angularForce=0,this.target=new s(0,0),this.targetSet=!1,this.thrust=2,this.targetAngle=0,this.targetAngleSet=!1,this.angleThrust=.02,this.cornerX=[0,0,0,0],this.cornerY=[0,0,0,0]}finalize(){return this.inertia=(this.dimension.x*this.dimension.x+this.dimension.y*this.dimension.y)*this.mass/12,this.calculateCorners(),this}setOrigin(t,i){return this.origin.x=t,this.origin.y=i,this}setAngle(t){return this.angle=t,this}setDimension(t,i){return this.dimension.x=t,this.dimension.y=i,this}setMass(t){return this.mass=t,this}setVelocity(t,i){return this.velocity.x=t,this.velocity.y=i,this}setAngularVelocity(t){return this.angularVelocity=t,this}setForce(t,i){return this.force.x=t,this.force.y=i,this}setAngularForce(t){return this.angularForce=t,this}setTarget(t,i){return this.target.x=t,this.target.y=i,this.targetSet=!0,this}hasTarget(){return this.targetSet}unsetTarget(){this.targetSet=!1}setTargetAngle(t){return this.targetAngle=t,this.targetAngleSet=!0,this}hasTargetAngle(){return this.targetAngleSet}unsetTargetAngle(){this.targetAngleSet=!1}advance(t){this.origin.x+=this.velocity.x*t,this.origin.y+=this.velocity.y*t,this.angle+=this.angularVelocity*t,this.angle>Math.Pi?this.angle-=2*Math.Pi:this.angle<-Math.Pi&&(this.angle+=2*Math.Pi),this.calculateCorners()}applyForces(t){if(this.targetSet){let i=this.target.x-this.origin.x,n=this.target.y-this.origin.y;const e=s.length(i,n);e>0&&(i*=this.thrust/e,n*=this.thrust/e,this.velocity.x+=i*t*this.invertedMass(),this.velocity.y+=n*t*this.invertedMass())}else this.velocity.x+=this.force.x*t*this.invertedMass(),this.velocity.y+=this.force.y*t*this.invertedMass();if(this.targetAngleSet){let i=this.targetAngle-this.angle;0!==i&&(i=this.angleThrust*Math.sign(i),this.angularVelocity+=i*t*this.invertedInertia())}else this.angularVelocity+=this.angularForce*t*this.invertedInertia();this.velocity.scale(Math.max(0,1-t*this.lateralFriction)),this.angularVelocity*=Math.max(0,1-t*this.rotationalFriction)}calculateCorners(){const t=Math.sin(this.angle),i=Math.cos(this.angle),s=-t,n=i;this.cornerX[0]=this.origin.x+i*this.dimension.x*.5+s*this.dimension.y*.5,this.cornerY[0]=this.origin.y+t*this.dimension.x*.5+n*this.dimension.y*.5,this.cornerX[1]=this.origin.x-i*this.dimension.x*.5+s*this.dimension.y*.5,this.cornerY[1]=this.origin.y-t*this.dimension.x*.5+n*this.dimension.y*.5,this.cornerX[2]=this.origin.x-i*this.dimension.x*.5-s*this.dimension.y*.5,this.cornerY[2]=this.origin.y-t*this.dimension.x*.5-n*this.dimension.y*.5,this.cornerX[3]=this.origin.x+i*this.dimension.x*.5-s*this.dimension.y*.5,this.cornerY[3]=this.origin.y+t*this.dimension.x*.5-n*this.dimension.y*.5}invertedMass(){return this.isFixedBody()?0:1/this.mass}invertedInertia(){return this.isFixedBody()||0===this.inertia?0:1/this.inertia}isFixedBody(){return-1===this.mass}addVelocity(t){this.velocity.add(t)}addAngularVelocity(t){this.angularVelocity+=t}collide(t,i,s){const e=new n(s);return this.collideAllCorners(e,t,i),e.collisionPoints.length<2&&t.collideAllCorners(e,this,i),0===e.collisionPoints.length?null:e}collideAllCorners(t,i,s){for(let n=0;n<4;n++)this.collideSingleCorner(t,i,n,s)}collideSingleCorner(t,i,n,o){const r=1e-5,h=i.cornerX[n],l=i.cornerY[n];let a=h-this.origin.x,c=l-this.origin.y;const d=Math.cos(-this.angle),g=Math.sin(-this.angle),u=a*g+c*d;a=a*d-c*g,c=u;const y=.5*this.dimension.x,m=.5*this.dimension.y;if(a>=-y-r&&a<=y+r&&c>=-m-r&&c<=m+r){const n=i.velocity,r=i.angularVelocity,d=this.velocity,g=this.angularVelocity,u=h-i.origin.x,x=l-i.origin.y,v=h-this.origin.x,p=l-this.origin.y;let f=-r*x,M=r*u;f-=-g*p,M-=g*v,f-=d.x,M-=d.y,f+=n.x,M+=n.y;let w=f*o,A=M*o;const V=Math.cos(-this.angle),P=Math.sin(-this.angle),X=w*P+A*V;w=w*V-A*P,A=X;let Y,E,B=m-c,F=B,I=0,S=0;if(B<-A&&(I=1),B=y+a,B<w&&(I|=2),B<F&&(F=B,S=1),B=m+c,B<A&&(I|=4),B<F&&(F=B,S=2),B=y-a,B<-w&&(I|=8),B<F&&(F=B,S=3),I>0){let t=0;Y=0,E=0;for(let i=0;i<4;i++)if((I&1<<i)>0){const n=i,e=3===n?0:n+1;let o=this.cornerX[n]-this.cornerX[e],r=this.cornerY[n]-this.cornerY[e];const h=1/s.length(o,r);o*=h,r*=h;const l=o;o=-r,r=l,Y+=o,E+=r,t++}if(t>1){const t=s.length(Y,E);Y/=t,E/=t}}else{const t=S,i=3===t?0:t+1;let n=this.cornerX[t]-this.cornerX[i],e=this.cornerY[t]-this.cornerY[i];const o=1/s.length(n,e);n*=o,e*=o;const r=n;n=-e,e=r,Y=n,E=e}const T=new e(i,this,Y,E,h,l,F);t.collisionPoints.push(T)}}}class r{constructor(t,i,n,e,o,r){this.id=t,this.origin=i,this.velocity=new s(0,0),this.angularVelocity=0,this.radius=n,this.width=e,this.startAngle=o,this.endAngle=r}collide(t,i,o){let r=null;for(let i=0;i<4;i++){const h=t.cornerX[i],l=t.cornerY[i],a=h-this.origin.x,c=l-this.origin.y,d=s.length(a,c),g=s.angle(a,c);if(d>=this.radius&&d<this.radius+this.width&&g>this.startAngle&&g<this.endAngle){null===r&&(r=new n(o));const i=d-this.radius;let a=this.origin.x-h,c=this.origin.y-l;const g=s.length(a,c);a/=g,c/=g;const u=new e(t,this,a,c,h,l,i);r.collisionPoints.push(u)}}return r}invertedMass(){return 0}invertedInertia(){return 0}addVelocity(t){}addAngularVelocity(t){}}class h extends o{constructor(t){super(t),this.setMass(-1)}}class l{constructor(t,i,n){this.id=t,this.origin=i,this.radius=n,this.velocity=new s(0,0),this.angularVelocity=0}collide(t,i,o){let r=null,h=!1;for(let i=0;i<4;i++){const l=t.cornerX[i],a=t.cornerY[i],c=l-this.origin.x,d=a-this.origin.y,g=s.length(c,d);if(g<=this.radius){null===r&&(r=new n(o));const i=this.radius-g;let c=l-this.origin.x,d=a-this.origin.y;const u=s.length(c,d);c/=u,d/=u;const y=new e(t,this,c,d,l,a,i);r.collisionPoints.push(y),h=!0}}for(let i=0;i<4&&!h;i++){const s=i,l=3===i?0:i+1,a=t.cornerX[s],c=t.cornerY[s],d=t.cornerX[l],g=t.cornerY[l];let u=d-a,y=g-c;const m=1/Math.sqrt(u*u+y*y);u*=m,y*=m;const x=u;u=-y,y=x;const v=this.origin.x,p=this.origin.y;let f=u*this.radius,M=y*this.radius;f+=this.origin.x,M+=this.origin.y;let w=NaN,A=NaN;const V=d-a,P=v-f,X=g-c,Y=p-M,E=v-a,B=p-c;let F=V*Y-P*X;F=1/F;const I=F*(Y*E-P*B),S=F*(V*B-X*E);if(I>=0&&I<=1&&S>=0&&S<=1){w=(d-a)*I+a,A=(g-c)*I+c}if(!isNaN(w)){null==r&&(r=new n(o));const i=new e(t,this,u,y,w,A,0);r.collisionPoints.push(i),h=!0}}return r}invertedMass(){return 0}invertedInertia(){return 0}addVelocity(t){}addAngularVelocity(t){}}class a{constructor(t,i,n){this.id=t,this.origin=i,this.start=i,this.end=n;const e=n.x-i.x,o=n.y-i.y;this.angle=s.angle(e,o),this.length=s.length(e,o),this.normal=new s(-o,e).scale(1/this.length),this.velocity=new s(0,0),this.angularVelocity=0}collide(t,i,s){let o=null;for(let i=0;i<4;i++){const r=t.cornerX[i],h=t.cornerY[i],l=r-this.start.x,a=h-this.start.y,c=Math.cos(-this.angle),d=Math.sin(-this.angle),g=l*c-a*d,u=l*d+a*c;if(g>=0&&g<=this.length&&u<0){null===o&&(o=new n(s));const i=-u,l=new e(t,this,this.normal.x,this.normal.y,r,h,i);o.collisionPoints.push(l)}}return o}overlaps(t){let i=!1,s=!1;for(let n=0;n<4;n++){const e=t.cornerX[n],o=t.cornerY[n],r=e-this.start.x,h=o-this.start.y,l=Math.cos(-this.angle),a=Math.sin(-this.angle),c=r*l-h*a,d=r*a+h*l;c>=0&&c<=this.length&&(i=i||d>=0,s=s||d<0)}return i&&s}invertedMass(){return 0}invertedInertia(){return 0}addVelocity(t){}addAngularVelocity(t){}}class c{constructor(){this.start=0,this.previous=0,this.remainder=0,this.restitution=1}*getMovingBodies(){}*getFixedBodies(){}preAdvance(t){}postAdvance(t){}collideBodies(t,i){return!0}advance(t){this.preAdvance(t);0===this.start&&(this.start=t),0===this.previous&&(this.previous=t);let i=t-this.previous+this.remainder;for(;i>10;)this.advanceByTimestep(.01),i-=10;this.previous=t,this.remainder=i,this.postAdvance(t)}advanceByTimestep(t){const i=this.collide(t);for(const i of this.getMovingBodies())i.applyForces(t);for(const t of i)t.apply();for(const i of this.getMovingBodies())i.advance(t)}collide(t){const i=[],s=new Set;for(const n of this.getMovingBodies()){s.add(n.id);for(const e of this.getMovingBodies())if(!s.has(e.id)&&this.collideBodies(n,e)&&this.collideBodies(e,n)){const s=n.collide(e,t,this.restitution);null!==s&&i.push(s)}}for(const s of this.getFixedBodies())for(const n of this.getMovingBodies())if(this.collideBodies(s,n)&&this.collideBodies(n,s)){const e=s.collide(n,t,this.restitution);null!==e&&i.push(e)}return n.mergeCollisions(i)}}export{o as Body,r as FixedArc,h as FixedBody,l as FixedCircle,a as FixedLine,c as State,s as Vector};
